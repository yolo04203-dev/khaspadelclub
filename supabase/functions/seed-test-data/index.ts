import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SeedRequest {
  teamCount?: number;
  clearExisting?: boolean;
}

// Generate random names
const adjectives = [
  "Swift", "Thunder", "Iron", "Golden", "Silver", "Blazing", "Storm", "Shadow", 
  "Royal", "Mighty", "Fierce", "Wild", "Epic", "Supreme", "Elite", "Prime",
  "Alpha", "Omega", "Turbo", "Ultra", "Mega", "Super", "Hyper", "Power"
];

const nouns = [
  "Eagles", "Tigers", "Lions", "Panthers", "Wolves", "Hawks", "Bears", "Dragons",
  "Knights", "Titans", "Warriors", "Champions", "Legends", "Masters", "Stars", "Flames",
  "Thunder", "Storm", "Lightning", "Phoenix", "Falcons", "Sharks", "Bulls", "Cobras"
];

const challengeStatuses = ["pending", "accepted", "declined", "expired", "cancelled"];
const matchStatuses = ["pending", "scheduled", "completed", "cancelled"];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

function generateTeamName(index: number): string {
  return `${randomElement(adjectives)} ${randomElement(nouns)} ${index}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Verify admin role
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SeedRequest = await req.json().catch(() => ({}));
    const teamCount = body.teamCount || 1000;
    const clearExisting = body.clearExisting || false;

    const results = {
      teams: 0,
      ladderRankings: 0,
      challenges: 0,
      matches: 0,
      errors: [] as string[],
    };

    console.log(`Starting seed with ${teamCount} teams, clearExisting: ${clearExisting}`);

    // Optionally clear existing test data
    if (clearExisting) {
      console.log("Clearing existing test data...");
      // Delete in reverse dependency order - only data marked as SEED
      await supabase.from("challenges").delete().like("message", "SEED_DATA%");
      await supabase.from("matches").delete().like("notes", "SEED_DATA%");
      await supabase.from("ladder_rankings").delete().gte("rank", 100);
      await supabase.from("teams").delete().like("name", "%SEED%");
    }

    // Get existing ladder categories for rankings
    const { data: ladderCategories } = await supabase
      .from("ladder_categories")
      .select("id")
      .limit(10);

    const categoryIds = ladderCategories?.map(c => c.id) || [];
    console.log(`Found ${categoryIds.length} ladder categories`);

    // Phase 1: Create teams in batches
    console.log("Phase 1: Creating teams...");
    const batchSize = 100;
    const teamIds: string[] = [];

    for (let i = 0; i < teamCount; i += batchSize) {
      const batch = [];
      const currentBatchSize = Math.min(batchSize, teamCount - i);
      
      for (let j = 0; j < currentBatchSize; j++) {
        const id = generateUUID();
        teamIds.push(id);
        batch.push({
          id,
          name: generateTeamName(i + j) + " SEED",
          is_recruiting: Math.random() > 0.8,
          created_by: null,
        });
      }

      const { error } = await supabase.from("teams").insert(batch);
      if (error) {
        results.errors.push(`Teams batch ${i}: ${error.message}`);
      } else {
        results.teams += batch.length;
      }
    }

    console.log(`Created ${results.teams} teams`);

    // Phase 2: Create ladder rankings
    console.log("Phase 2: Creating ladder rankings...");
    if (categoryIds.length > 0) {
      // Distribute teams across categories
      for (let i = 0; i < teamIds.length; i += batchSize) {
        const batch = [];
        const currentBatchSize = Math.min(batchSize, teamIds.length - i);
        
        for (let j = 0; j < currentBatchSize; j++) {
          const teamIndex = i + j;
          batch.push({
            team_id: teamIds[teamIndex],
            ladder_category_id: randomElement(categoryIds),
            rank: 100 + teamIndex, // Start from rank 100 to not interfere with real data
            points: randomInt(0, 1000),
            wins: randomInt(0, 50),
            losses: randomInt(0, 30),
            streak: randomInt(-5, 10),
          });
        }

        const { error } = await supabase.from("ladder_rankings").insert(batch);
        if (error) {
          results.errors.push(`Ladder rankings batch ${i}: ${error.message}`);
        } else {
          results.ladderRankings += batch.length;
        }
      }
    } else {
      results.errors.push("No ladder categories found - skipping rankings");
    }

    console.log(`Created ${results.ladderRankings} ladder rankings`);

    // Phase 3: Create challenges (5x team count)
    console.log("Phase 3: Creating challenges...");
    const challengeCount = Math.min(5000, teamIds.length * 5);
    
    for (let i = 0; i < challengeCount; i += batchSize) {
      const batch = [];
      const currentBatchSize = Math.min(batchSize, challengeCount - i);
      
      for (let j = 0; j < currentBatchSize; j++) {
        const challengerIndex = randomInt(0, teamIds.length - 1);
        let challengedIndex = randomInt(0, teamIds.length - 1);
        // Ensure different teams
        while (challengedIndex === challengerIndex && teamIds.length > 1) {
          challengedIndex = randomInt(0, teamIds.length - 1);
        }

        const status = randomElement(challengeStatuses);
        batch.push({
          challenger_team_id: teamIds[challengerIndex],
          challenged_team_id: teamIds[challengedIndex],
          ladder_category_id: categoryIds.length > 0 ? randomElement(categoryIds) : null,
          status,
          message: `SEED_DATA challenge ${i + j}`,
          expires_at: new Date(Date.now() + randomInt(1, 7) * 24 * 60 * 60 * 1000).toISOString(),
          responded_at: status !== "pending" ? new Date().toISOString() : null,
        });
      }

      const { error } = await supabase.from("challenges").insert(batch);
      if (error) {
        results.errors.push(`Challenges batch ${i}: ${error.message}`);
      } else {
        results.challenges += batch.length;
      }
    }

    console.log(`Created ${results.challenges} challenges`);

    // Phase 4: Create matches (3x team count)
    console.log("Phase 4: Creating matches...");
    const matchCount = Math.min(3000, teamIds.length * 3);
    
    for (let i = 0; i < matchCount; i += batchSize) {
      const batch = [];
      const currentBatchSize = Math.min(batchSize, matchCount - i);
      
      for (let j = 0; j < currentBatchSize; j++) {
        const challengerIndex = randomInt(0, teamIds.length - 1);
        let challengedIndex = randomInt(0, teamIds.length - 1);
        while (challengedIndex === challengerIndex && teamIds.length > 1) {
          challengedIndex = randomInt(0, teamIds.length - 1);
        }

        const status = randomElement(matchStatuses);
        const isCompleted = status === "completed";
        const challengerScore = isCompleted ? randomInt(0, 21) : null;
        const challengedScore = isCompleted ? randomInt(0, 21) : null;
        
        let winnerId = null;
        if (isCompleted && challengerScore !== null && challengedScore !== null) {
          winnerId = challengerScore > challengedScore 
            ? teamIds[challengerIndex] 
            : teamIds[challengedIndex];
        }

        batch.push({
          challenger_team_id: teamIds[challengerIndex],
          challenged_team_id: teamIds[challengedIndex],
          status,
          challenger_score: challengerScore,
          challenged_score: challengedScore,
          winner_team_id: winnerId,
          notes: `SEED_DATA match ${i + j}`,
          scheduled_at: new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: isCompleted ? new Date().toISOString() : null,
        });
      }

      const { error } = await supabase.from("matches").insert(batch);
      if (error) {
        results.errors.push(`Matches batch ${i}: ${error.message}`);
      } else {
        results.matches += batch.length;
      }
    }

    console.log(`Created ${results.matches} matches`);

    const summary = {
      success: true,
      message: "Seed data created successfully",
      results,
      totalRecords: results.teams + results.ladderRankings + results.challenges + results.matches,
      timestamp: new Date().toISOString(),
    };

    console.log("Seed complete:", JSON.stringify(summary, null, 2));

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
