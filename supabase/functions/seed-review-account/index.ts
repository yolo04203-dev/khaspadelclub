import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { secret } = await req.json();
    if (secret !== "khas-review-seed-2026") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const EMAIL = "playreview@khaspadelclub.com";
    const PASSWORD = "PlayReview123!";

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === EMAIL);

    if (existing) {
      return new Response(
        JSON.stringify({ message: "Review account already exists", userId: existing.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Create auth user (handle_new_user trigger creates profile + player role)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: "Play Reviewer" },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create user: ${authError?.message}`);
    }

    const userId = authData.user.id;
    console.log(`Created review user: ${userId}`);

    // Wait for trigger to fire
    await new Promise((r) => setTimeout(r, 1000));

    // Step 2: Update profile with is_test flag
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ display_name: "Play Reviewer", is_test: true, bio: "Store Review Account — Do Not Remove" })
      .eq("user_id", userId);

    if (profileError) console.error("Profile update error:", profileError.message);

    // Step 3: Grant admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (roleError) console.error("Role insert error:", roleError.message);

    // Step 4: Create team
    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .insert({ name: "Demo Team — Review", created_by: userId })
      .select("id")
      .single();

    if (teamError || !teamData) {
      throw new Error(`Failed to create team: ${teamError?.message}`);
    }

    const teamId = teamData.id;

    // Add user as captain
    await supabase.from("team_members").insert({
      team_id: teamId,
      user_id: userId,
      is_captain: true,
    });

    console.log(`Created team: ${teamId}`);

    // Step 5: Add to Category A ladder ranking
    const categoryAId = "fc6e6d17-0fe7-4989-bc90-5ac591a9e479";

    // Get current max rank
    const { data: maxRankData } = await supabase
      .from("ladder_rankings")
      .select("rank")
      .eq("ladder_category_id", categoryAId)
      .order("rank", { ascending: false })
      .limit(1);

    const nextRank = (maxRankData?.[0]?.rank ?? 0) + 1;

    await supabase.from("ladder_rankings").insert({
      team_id: teamId,
      ladder_category_id: categoryAId,
      rank: nextRank,
      points: 1200,
      wins: 3,
      losses: 1,
      streak: 2,
      last_match_at: new Date().toISOString(),
    });

    console.log(`Added to ladder at rank ${nextRank}`);

    // Step 6: Create sample completed matches against existing teams
    const opponentTeams = [
      "e8901270-86ef-450d-b930-c6cacb555552", // Ali & Hassan
      "708bdc1f-2ccb-40b3-92b4-dd1d5e267fed", // Usman & Bilal
      "9469b998-7031-4f33-94e2-4bfadcc6fef1", // Ahmed & Farhan
    ];

    const matchResults = [
      { opponent: opponentTeams[0], challengerScore: 6, challengedScore: 4, win: true, daysAgo: 3 },
      { opponent: opponentTeams[1], challengerScore: 3, challengedScore: 6, win: false, daysAgo: 5 },
      { opponent: opponentTeams[2], challengerScore: 6, challengedScore: 2, win: true, daysAgo: 7 },
    ];

    for (const m of matchResults) {
      const completedAt = new Date(Date.now() - m.daysAgo * 86400000).toISOString();
      await supabase.from("matches").insert({
        challenger_team_id: teamId,
        challenged_team_id: m.opponent,
        challenger_score: m.challengerScore,
        challenged_score: m.challengedScore,
        winner_team_id: m.win ? teamId : m.opponent,
        status: "completed",
        completed_at: completedAt,
        scheduled_at: completedAt,
        sets_won_challenger: m.win ? 2 : 1,
        sets_won_challenged: m.win ? 1 : 2,
        challenger_sets: [{ team1: m.win ? 6 : 4, team2: m.win ? 4 : 6 }, { team1: 6, team2: 3 }, ...(m.win ? [] : [{ team1: 3, team2: 6 }])],
        challenged_sets: [{ team1: m.win ? 4 : 6, team2: m.win ? 6 : 4 }, { team1: 3, team2: 6 }, ...(m.win ? [] : [{ team1: 6, team2: 3 }])],
      });
    }

    console.log("Created 3 sample matches");

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        teamId,
        email: EMAIL,
        message: "Review account created with admin access, team, ladder ranking, and match history.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Seed error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
