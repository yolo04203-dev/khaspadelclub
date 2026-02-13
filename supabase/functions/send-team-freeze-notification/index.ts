import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FreezeNotificationRequest {
  teamId: string;
  teamName: string;
  action: "freeze" | "unfreeze";
  frozenUntil?: string;
  reason?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;

    // Create service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is an admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const rawPayload: FreezeNotificationRequest = await req.json();

    if (!rawPayload.teamId || !rawPayload.teamName || !rawPayload.action) {
      throw new Error("Missing required fields: teamId, teamName, action");
    }

    const teamId = rawPayload.teamId;
    const teamName = escapeHtml(rawPayload.teamName);
    const action = rawPayload.action;
    const frozenUntil = rawPayload.frozenUntil;
    const reason = rawPayload.reason ? escapeHtml(rawPayload.reason) : undefined;

    // Get team members with their user IDs
    const { data: teamMembers, error: membersError } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId);

    if (membersError) {
      console.error("Error fetching team members:", membersError);
      throw new Error("Failed to fetch team members");
    }

    if (!teamMembers || teamMembers.length === 0) {
      console.log("No team members found for team:", teamId);
      return new Response(JSON.stringify({ success: true, message: "No team members to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user emails from auth.users
    const userIds = teamMembers.map(m => m.user_id);
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw new Error("Failed to fetch user emails");
    }

    const emails = users.users
      .filter(u => userIds.includes(u.id) && u.email)
      .map(u => u.email!);

    if (emails.length === 0) {
      console.log("No valid emails found for team members");
      return new Response(JSON.stringify({ success: true, message: "No valid emails to send to" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Format the email content based on action
    let subject: string;
    let htmlContent: string;

    if (action === "freeze") {
      const freezeDate = frozenUntil ? new Date(frozenUntil).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }) : "an unspecified date";

      subject = `Your team "${teamName}" has been frozen`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a2e;">Team Freeze Notice</h1>
          <p>Hello,</p>
          <p>Your team <strong>${teamName}</strong> has been frozen by an administrator.</p>
          <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Frozen until:</strong> ${freezeDate}</p>
            ${reason ? `<p style="margin: 8px 0 0 0;"><strong>Reason:</strong> ${reason}</p>` : ""}
          </div>
          <p>During this time, other teams will not be able to challenge your team on the ladder.</p>
          <p>If you have any questions, please contact the ladder administrator.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #6b7280; font-size: 14px;">This is an automated notification from your ladder system.</p>
        </div>
      `;
    } else {
      subject = `Your team "${teamName}" has been unfrozen`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a2e;">Team Unfreeze Notice</h1>
          <p>Hello,</p>
          <p>Great news! Your team <strong>${teamName}</strong> has been unfrozen by an administrator.</p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
            <p style="margin: 0;">Your team is now active and can receive challenges again.</p>
          </div>
          <p>Get ready to compete!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #6b7280; font-size: 14px;">This is an automated notification from your ladder system.</p>
        </div>
      `;
    }

    // Send email to all team members using Resend REST API
    console.log(`Sending ${action} notification to:`, emails);
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev", // Test mode sender
        to: emails,
        subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Email send failed:", emailResult);
      throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-team-freeze-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
