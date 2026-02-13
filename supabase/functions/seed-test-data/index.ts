import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const adjectives = [
  "Swift","Thunder","Iron","Golden","Silver","Blazing","Storm","Shadow",
  "Royal","Mighty","Fierce","Wild","Epic","Supreme","Elite","Prime",
  "Alpha","Omega","Turbo","Ultra","Mega","Super","Hyper","Power",
];
const nouns = [
  "Eagles","Tigers","Lions","Panthers","Wolves","Hawks","Bears","Dragons",
  "Knights","Titans","Warriors","Champions","Legends","Masters","Stars","Flames",
  "Thunder","Storm","Lightning","Phoenix","Falcons","Sharks","Bulls","Cobras",
];
const firstNames = [
  "Carlos","Miguel","Pablo","Diego","Luis","Alejandro","Fernando","Roberto",
  "Eduardo","Ricardo","Andres","Javier","Daniel","Gabriel","Santiago",
  "Oscar","Rafael","Marco","Hugo","Ivan","Sofia","Maria","Isabella",
  "Valentina","Camila","Ana","Laura","Elena","Lucia","Carmen",
  "Alex","Sam","Jordan","Taylor","Casey","Morgan","Quinn","Riley",
  "Noor","Ali","Omar","Hassan","Yuki","Kai","Leo","Max",
];
const lastNames = [
  "Garcia","Rodriguez","Martinez","Lopez","Hernandez","Gonzalez","Perez",
  "Sanchez","Ramirez","Torres","Flores","Rivera","Morales","Ortiz",
  "Cruz","Reyes","Gutierrez","Mendez","Ramos","Castillo","Vargas",
  "Romero","Diaz","Alvarez","Jimenez","Silva","Rojas","Medina",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uuid(): string { return crypto.randomUUID(); }

async function authenticateAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) throw new Error("Unauthorized");

  const userId = data.user.id;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
  if (!isAdmin) throw new Error("Forbidden: Admin access required");

  return supabase;
}

async function cleanupSeedData(supabase: any) {
  console.log("Cleaning existing seed data...");
  const { data: seedSessions } = await supabase
    .from("americano_sessions").select("id").like("name", "%SEED%");
  const sessionIds = seedSessions?.map((s: any) => s.id) || [];

  if (sessionIds.length > 0) {
    await supabase.from("americano_team_matches").delete().in("session_id", sessionIds);
    await supabase.from("americano_rounds").delete().in("session_id", sessionIds);
    await supabase.from("americano_teams").delete().in("session_id", sessionIds);
    await supabase.from("americano_players").delete().in("session_id", sessionIds);
    await supabase.from("americano_sessions").delete().in("id", sessionIds);
  }

  const { data: seedTeams } = await supabase
    .from("teams").select("id").like("name", "%SEED%");
  const seedTeamIds = seedTeams?.map((t: any) => t.id) || [];

  if (seedTeamIds.length > 0) {
    await supabase.from("tournament_matches").delete().in("team1_id", seedTeamIds);
    await supabase.from("tournament_matches").delete().in("team2_id", seedTeamIds);
    await supabase.from("tournament_participants").delete().in("team_id", seedTeamIds);
    await supabase.from("challenges").delete().in("challenger_team_id", seedTeamIds);
    await supabase.from("challenges").delete().in("challenged_team_id", seedTeamIds);
    await supabase.from("matches").delete().in("challenger_team_id", seedTeamIds);
    await supabase.from("matches").delete().in("challenged_team_id", seedTeamIds);
    await supabase.from("ladder_rankings").delete().in("team_id", seedTeamIds);
    await supabase.from("teams").delete().in("id", seedTeamIds);
  }
  console.log("Cleanup complete");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = await authenticateAdmin(req);
    const body = await req.json().catch(() => ({}));
    const teamCount = body.teamCount || 250;
    const teamsPerLadder = body.teamsPerLadder || 100;
    const clearExisting = body.clearExisting || false;
    const batchSize = 50;

    const results = {
      teams: 0, ladderRankings: 0, challenges: 0, matches: 0,
      tournamentParticipants: 0, americanoSessions: 0,
      americanoTeams: 0, americanoTeamMatches: 0,
      americanoPlayers: 0, americanoRounds: 0,
      errors: [] as string[],
    };

    if (clearExisting) await cleanupSeedData(supabase);

    // ── Phase 1: Create Teams (no FK to auth.users needed, created_by is nullable) ──
    console.log(`Phase 1: Creating ${teamCount} teams...`);
    const teamIds: string[] = [];

    for (let i = 0; i < teamCount; i += batchSize) {
      const batch = [];
      for (let j = 0; j < Math.min(batchSize, teamCount - i); j++) {
        const teamId = uuid();
        teamIds.push(teamId);
        batch.push({
          id: teamId,
          name: `${pick(adjectives)} ${pick(nouns)} ${i + j + 1} SEED`,
          is_recruiting: Math.random() > 0.8,
          created_by: null,
        });
      }
      const { error } = await supabase.from("teams").insert(batch);
      if (error) results.errors.push(`Teams ${i}: ${error.message}`);
      else results.teams += batch.length;
    }
    console.log(`Created ${results.teams} teams`);

    // ── Phase 2: Ladder Rankings ──
    console.log("Phase 2: Ladder rankings...");
    const { data: ladderCats } = await supabase
      .from("ladder_categories").select("id, name").limit(10);
    const catIds = ladderCats?.map((c: any) => c.id) || [];
    console.log(`Found ${catIds.length} ladder categories: ${ladderCats?.map((c: any) => c.name).join(", ")}`);

    if (catIds.length > 0 && teamIds.length > 0) {
      // Distribute teamsPerLadder teams into each category
      let teamIdx = 0;
      for (const catId of catIds) {
        const count = Math.min(teamsPerLadder, teamIds.length - teamIdx);
        if (count <= 0) break;

        for (let i = 0; i < count; i += batchSize) {
          const batch = [];
          for (let j = 0; j < Math.min(batchSize, count - i); j++) {
            batch.push({
              team_id: teamIds[teamIdx],
              ladder_category_id: catId,
              rank: 100 + teamIdx,
              points: randInt(100, 2000),
              wins: randInt(0, 80),
              losses: randInt(0, 50),
              streak: randInt(-5, 15),
            });
            teamIdx++;
          }
          const { error } = await supabase.from("ladder_rankings").insert(batch);
          if (error) results.errors.push(`Rankings cat ${catId} batch ${i}: ${error.message}`);
          else results.ladderRankings += batch.length;
        }
      }
    }
    console.log(`Created ${results.ladderRankings} ladder rankings`);

    // ── Phase 3: Challenges ──
    const challengeCount = Math.min(500, teamIds.length * 2);
    console.log(`Phase 3: Creating ${challengeCount} challenges...`);
    const statusWeights = [
      ...Array(40).fill("pending"), ...Array(20).fill("accepted"),
      ...Array(15).fill("declined"), ...Array(15).fill("expired"),
      ...Array(10).fill("cancelled"),
    ];

    for (let i = 0; i < challengeCount; i += batchSize) {
      const batch = [];
      for (let j = 0; j < Math.min(batchSize, challengeCount - i); j++) {
        let a = randInt(0, teamIds.length - 1), b = randInt(0, teamIds.length - 1);
        while (b === a) b = randInt(0, teamIds.length - 1);
        const status = pick(statusWeights);
        batch.push({
          challenger_team_id: teamIds[a],
          challenged_team_id: teamIds[b],
          ladder_category_id: catIds.length > 0 ? pick(catIds) : null,
          status,
          message: `SEED_DATA challenge ${i + j}`,
          expires_at: new Date(Date.now() + randInt(1, 7) * 86400000).toISOString(),
          responded_at: status !== "pending" ? new Date().toISOString() : null,
        });
      }
      const { error } = await supabase.from("challenges").insert(batch);
      if (error) results.errors.push(`Challenges ${i}: ${error.message}`);
      else results.challenges += batch.length;
    }
    console.log(`Created ${results.challenges} challenges`);

    // ── Phase 4: Matches ──
    const matchCount = Math.min(400, teamIds.length * 2);
    console.log(`Phase 4: Creating ${matchCount} matches...`);

    for (let i = 0; i < matchCount; i += batchSize) {
      const batch = [];
      for (let j = 0; j < Math.min(batchSize, matchCount - i); j++) {
        let a = randInt(0, teamIds.length - 1), b = randInt(0, teamIds.length - 1);
        while (b === a) b = randInt(0, teamIds.length - 1);
        const r = Math.random();
        const status = r < 0.6 ? "completed" : r < 0.85 ? "scheduled" : "pending";
        const done = status === "completed";
        const cs = done ? randInt(0, 21) : null;
        const ds = done ? randInt(0, 21) : null;
        const winner = done ? (cs! > ds! ? teamIds[a] : teamIds[b]) : null;

        batch.push({
          challenger_team_id: teamIds[a],
          challenged_team_id: teamIds[b],
          status,
          challenger_score: cs,
          challenged_score: ds,
          winner_team_id: winner,
          notes: `SEED_DATA match ${i + j}`,
          scheduled_at: new Date(Date.now() - randInt(-7, 30) * 86400000).toISOString(),
          completed_at: done ? new Date(Date.now() - randInt(0, 14) * 86400000).toISOString() : null,
        });
      }
      const { error } = await supabase.from("matches").insert(batch);
      if (error) results.errors.push(`Matches ${i}: ${error.message}`);
      else results.matches += batch.length;
    }
    console.log(`Created ${results.matches} matches`);

    // ── Phase 5: Tournament Participants ──
    console.log("Phase 5: Tournament participants...");
    const { data: tournCats } = await supabase
      .from("tournament_categories").select("id, tournament_id, max_teams").limit(20);

    if (tournCats && tournCats.length > 0) {
      let tIdx = 0;
      for (const cat of tournCats) {
        const count = Math.min(cat.max_teams || 8, 15);
        const batch = [];
        for (let k = 0; k < count && tIdx < teamIds.length; k++, tIdx++) {
          batch.push({
            team_id: teamIds[tIdx % teamIds.length],
            tournament_id: cat.tournament_id,
            category_id: cat.id,
            payment_status: Math.random() > 0.3 ? "paid" : "pending",
            seed: k + 1,
            player1_name: `${pick(firstNames)} ${pick(lastNames)}`,
            player2_name: `${pick(firstNames)} ${pick(lastNames)}`,
            custom_team_name: `${pick(adjectives)} ${pick(nouns)} SEED`,
          });
        }
        if (batch.length > 0) {
          const { error } = await supabase.from("tournament_participants").insert(batch);
          if (error) results.errors.push(`TournPart: ${error.message}`);
          else results.tournamentParticipants += batch.length;
        }
      }
    }
    console.log(`Created ${results.tournamentParticipants} tournament participants`);

    // ── Phase 6: Americano Sessions ──
    console.log("Phase 6: Americano sessions...");

    // 3 individual sessions (user_id set to null to avoid FK issues)
    for (let s = 0; s < 3; s++) {
      const sessionId = uuid();
      const { error: se } = await supabase.from("americano_sessions").insert({
        id: sessionId,
        name: `SEED Individual Session ${s + 1}`,
        mode: "individual",
        status: "completed",
        points_per_round: 21,
        total_rounds: 3,
        current_round: 3,
        completed_at: new Date().toISOString(),
        started_at: new Date(Date.now() - randInt(1, 14) * 86400000).toISOString(),
        created_by: null,
      });
      if (se) { results.errors.push(`AmerSession ${s}: ${se.message}`); continue; }
      results.americanoSessions++;

      const playerIds: string[] = [];
      const playerBatch = [];
      for (let p = 0; p < 8; p++) {
        const pid = uuid();
        playerIds.push(pid);
        playerBatch.push({
          id: pid,
          session_id: sessionId,
          player_name: `${pick(firstNames)} ${pick(lastNames)}`,
          user_id: null,
          total_points: randInt(10, 63),
          matches_played: 3,
        });
      }
      const { error: pe } = await supabase.from("americano_players").insert(playerBatch);
      if (pe) { results.errors.push(`AmerPlayers ${s}: ${pe.message}`); continue; }
      results.americanoPlayers += playerBatch.length;

      const roundBatch = [];
      for (let r = 1; r <= 3; r++) {
        for (let court = 1; court <= 2; court++) {
          const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
          roundBatch.push({
            session_id: sessionId,
            round_number: r,
            court_number: court,
            team1_player1_id: shuffled[0],
            team1_player2_id: shuffled[1],
            team2_player1_id: shuffled[2],
            team2_player2_id: shuffled[3],
            team1_score: randInt(5, 21),
            team2_score: randInt(5, 21),
            completed_at: new Date(Date.now() - randInt(0, 7) * 86400000).toISOString(),
          });
        }
      }
      const { error: re } = await supabase.from("americano_rounds").insert(roundBatch);
      if (re) results.errors.push(`AmerRounds ${s}: ${re.message}`);
      else results.americanoRounds += roundBatch.length;
    }

    // 2 team sessions
    for (let s = 0; s < 2; s++) {
      const sessionId = uuid();
      const { error: se } = await supabase.from("americano_sessions").insert({
        id: sessionId,
        name: `SEED Team Session ${s + 1}`,
        mode: "team",
        status: "completed",
        points_per_round: 21,
        total_rounds: 5,
        current_round: 5,
        completed_at: new Date().toISOString(),
        started_at: new Date(Date.now() - randInt(1, 14) * 86400000).toISOString(),
        created_by: null,
      });
      if (se) { results.errors.push(`AmerTeamSession ${s}: ${se.message}`); continue; }
      results.americanoSessions++;

      const ateamIds: string[] = [];
      const teamBatch = [];
      for (let t = 0; t < 6; t++) {
        const tid = uuid();
        ateamIds.push(tid);
        teamBatch.push({
          id: tid,
          session_id: sessionId,
          team_name: `${pick(adjectives)} ${pick(nouns)} SEED`,
          player1_name: `${pick(firstNames)} ${pick(lastNames)}`,
          player2_name: `${pick(firstNames)} ${pick(lastNames)}`,
          total_points: randInt(20, 105),
          wins: randInt(0, 5),
          losses: randInt(0, 5),
          matches_played: 5,
        });
      }
      const { error: te } = await supabase.from("americano_teams").insert(teamBatch);
      if (te) results.errors.push(`AmerTeams ${s}: ${te.message}`);
      else results.americanoTeams += teamBatch.length;

      const matchBatch = [];
      let roundNum = 1;
      for (let i = 0; i < ateamIds.length; i++) {
        for (let j = i + 1; j < ateamIds.length; j++) {
          matchBatch.push({
            session_id: sessionId,
            round_number: roundNum,
            court_number: ((matchBatch.length % 3) + 1),
            team1_id: ateamIds[i],
            team2_id: ateamIds[j],
            team1_score: randInt(5, 21),
            team2_score: randInt(5, 21),
            completed_at: new Date(Date.now() - randInt(0, 7) * 86400000).toISOString(),
          });
          if (matchBatch.length % 3 === 0) roundNum++;
        }
      }
      const { error: me } = await supabase.from("americano_team_matches").insert(matchBatch);
      if (me) results.errors.push(`AmerTeamMatches ${s}: ${me.message}`);
      else results.americanoTeamMatches += matchBatch.length;
    }

    console.log(`Americano: ${results.americanoSessions} sessions, ${results.americanoPlayers} players, ${results.americanoRounds} rounds, ${results.americanoTeams} teams, ${results.americanoTeamMatches} team matches`);

    const total = Object.entries(results)
      .filter(([k]) => k !== "errors")
      .reduce((sum, [, v]) => sum + (v as number), 0);

    const summary = { success: true, message: "Seed complete", results, totalRecords: total, timestamp: new Date().toISOString() };
    console.log("Seed complete:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: error.message === "Unauthorized" ? 401 : error.message?.includes("Forbidden") ? 403 : 500 },
    );
  }
});
