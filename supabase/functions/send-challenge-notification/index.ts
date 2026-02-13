import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChallengeNotificationRequest {
  type: "new_challenge" | "challenge_accepted" | "challenge_declined" | "match_reminder" | "score_submitted";
  challengeId?: string;
  matchId?: string;
  challengerTeamId?: string;
  challengerTeamName?: string;
  challengedTeamId?: string;
  challengedTeamName?: string;
  declineReason?: string;
  scheduledAt?: string;
  venue?: string;
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

    const userId = claimsData.claims.sub as string;

    // Create service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ChallengeNotificationRequest = await req.json();

    const type = payload.type;
    const challengerTeamId = payload.challengerTeamId;
    const challengerTeamName = payload.challengerTeamName ? escapeHtml(payload.challengerTeamName) : undefined;
    const challengedTeamId = payload.challengedTeamId;
    const challengedTeamName = payload.challengedTeamName ? escapeHtml(payload.challengedTeamName) : undefined;
    const declineReason = payload.declineReason ? escapeHtml(payload.declineReason) : undefined;
    const scheduledAt = payload.scheduledAt;
    const venue = payload.venue ? escapeHtml(payload.venue) : undefined;

    // Verify user is a member of one of the involved teams or is an admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    
    let isAuthorized = isAdmin;
    
    if (!isAuthorized && challengerTeamId) {
      const { data: isChallengerMember } = await supabase.rpc("is_team_member", { 
        _user_id: userId, 
        _team_id: challengerTeamId 
      });
      isAuthorized = isChallengerMember;
    }
    
    if (!isAuthorized && challengedTeamId) {
      const { data: isChallengedMember } = await supabase.rpc("is_team_member", { 
        _user_id: userId, 
        _team_id: challengedTeamId 
      });
      isAuthorized = isChallengedMember;
    }
    
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: Must be team member or admin" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Determine which team to notify based on the event type
    let targetTeamId: string | undefined;
    let subject: string;
    let htmlContent: string;

    switch (type) {
      case "new_challenge":
        targetTeamId = challengedTeamId;
        subject = `New challenge from ${challengerTeamName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">New Challenge Received!</h1>
            <p>Hello,</p>
            <p>Your team has been challenged by <strong>${challengerTeamName}</strong>.</p>
            <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;">Log in to accept or decline this challenge.</p>
            </div>
            <p>Good luck!</p>
          </div>
        `;
        break;

      case "challenge_accepted":
        targetTeamId = challengerTeamId;
        subject = `${challengedTeamName} accepted your challenge!`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Challenge Accepted!</h1>
            <p>Hello,</p>
            <p>Great news! <strong>${challengedTeamName}</strong> has accepted your challenge.</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;">Log in to schedule your match and record the result.</p>
            </div>
            <p>May the best team win!</p>
          </div>
        `;
        break;

      case "challenge_declined":
        targetTeamId = challengerTeamId;
        subject = `${challengedTeamName} declined your challenge`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Challenge Declined</h1>
            <p>Hello,</p>
            <p><strong>${challengedTeamName}</strong> has declined your challenge.</p>
            ${declineReason ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Reason:</strong> ${declineReason}</p>
              </div>
            ` : ""}
            <p>Don't worry, there are plenty of other opponents to challenge!</p>
          </div>
        `;
        break;

      case "match_reminder":
        // Send to both teams - for now just to challenged team
        targetTeamId = challengedTeamId;
        const formattedDate = scheduledAt ? new Date(scheduledAt).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }) : "soon";
        subject = `Match reminder: vs ${challengerTeamName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Match Reminder</h1>
            <p>Hello,</p>
            <p>Just a reminder about your upcoming match against <strong>${challengerTeamName}</strong>.</p>
            <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>When:</strong> ${formattedDate}</p>
              ${venue ? `<p style="margin: 8px 0 0 0;"><strong>Where:</strong> ${venue}</p>` : ""}
            </div>
            <p>Good luck!</p>
          </div>
        `;
        break;

      case "score_submitted":
        // Notify the other team to confirm the score
        targetTeamId = challengedTeamId;
        subject = `Score submitted by ${challengerTeamName} - please confirm`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Score Confirmation Required</h1>
            <p>Hello,</p>
            <p><strong>${challengerTeamName}</strong> has submitted the score for your match.</p>
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;">Please log in to confirm or dispute the submitted score.</p>
            </div>
            <p>Thank you!</p>
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    if (!targetTeamId) {
      throw new Error("Target team ID is required");
    }

    // Get team members with their user IDs
    const { data: teamMembers, error: membersError } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", targetTeamId);

    if (membersError) {
      console.error("Error fetching team members:", membersError);
      throw new Error("Failed to fetch team members");
    }

    if (!teamMembers || teamMembers.length === 0) {
      console.log("No team members found for team:", targetTeamId);
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

    // Send email using Resend REST API
    console.log(`Sending ${type} notification to ${emails.length} recipients`);
    
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
    console.error("Error in send-challenge-notification:", error);
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
