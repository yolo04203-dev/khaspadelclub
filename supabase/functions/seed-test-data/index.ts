import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Name generators ──────────────────────────────────────────────
const firstNames = [
  "Carlos","Miguel","Pablo","Diego","Luis","Alejandro","Fernando","Roberto",
  "Eduardo","Ricardo","Andres","Javier","Daniel","Gabriel","Santiago",
  "Oscar","Rafael","Marco","Hugo","Ivan","Sofia","Maria","Isabella",
  "Valentina","Camila","Ana","Laura","Elena","Lucia","Carmen",
  "Alex","Sam","Jordan","Taylor","Casey","Morgan","Quinn","Riley",
  "Noor","Ali","Omar","Hassan","Yuki","Kai","Leo","Max",
  "Jan","Per","Erik","Sven",
];
const lastNames = [
  "Garcia","Rodriguez","Martinez","Lopez","Hernandez","Gonzalez","Perez",
  "Sanchez","Ramirez","Torres","Flores","Rivera","Morales","Ortiz",
  "Cruz","Reyes","Gutierrez","Mendez","Ramos","Castillo","Vargas",
  "Romero","Diaz","Alvarez","Jimenez","Silva","Rojas","Medina",
  "Aguilar","Herrera","Navarro","Santos","Delgado","Rios","Vega",
  "Acosta","Bautista","Campos","Contreras","Dominguez","Espinoza",
  "Fuentes","Guerrero","Luna","Maldonado","Molina","Pacheco","Ruiz",
  "Soto","Valencia",
];
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
const skillLevels = ["Beginner","Intermediate","Advanced","Pro"];
const bios = [
  "Love padel!","Weekend warrior","Training hard","Looking for partners",
  "Competitive player","Just started","All-rounder","Net specialist",
  "Smash king","Wall master","Glass court fan","Tournament regular",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uuid(): string { return crypto.randomUUID(); }

// ── Auth helper ──────────────────────────────────────────────────
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
  const { data: claimsData, error } = await supabaseAuth.auth.getClaims(token);
  if (error || !claimsData?.claims) throw new Error("Unauthorized");

  const userId = claimsData.claims.sub as string;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
  if (!isAdmin) throw new Error("Forbidden: Admin access required");

  return supabase;
}

// ── Cleanup ──────────────────────────────────────────────────────
async function cleanupSeedData(supabase: any) {
  console.log("Cleaning existing seed data...");
  // Get seed session IDs first
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

  // Get seed team IDs for tournament cleanup
  const { data: seedTeams } = await supabase
    .from("teams").select("id").like("name", "%SEED%");
  const seedTeamIds = seedTeams?.map((t: any) => t.id) || [];

  if (seedTeamIds.length > 0) {
    // Tournament matches where either team is seed
    await supabase.from("tournament_matches").delete().in("team1_id", seedTeamIds);
    await supabase.from("tournament_matches").delete().in("team2_id", seedTeamIds);
    await supabase.from("tournament_participants").delete().in("team_id", seedTeamIds);
  }

  await supabase.from("challenges").delete().like("message", "SEED_DATA%");
  await supabase.from("matches").delete().like("notes", "SEED_DATA%");
  await supabase.from("ladder_rankings").delete().gte("rank", 100);

  if (seedTeamIds.length > 0) {
    await supabase.from("team_members").delete().in("team_id", seedTeamIds);
    await supabase.from("teams").delete().in("id", seedTeamIds);
  }

  await supabase.from("profiles").delete().like("bio", "SEED_DATA%");
  console.log("Cleanup complete");
}

// ── Main handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = await authenticateAdmin(req);
    const body = await req.json().catch(() => ({}));
    const userCount = body.userCount || 500;
    const clearExisting = body.clearExisting || false;
    const batchSize = 100;

    const results = {
      profiles: 0, teams: 0, teamMembers: 0, ladderRankings: 0,
      challenges: 0, matches: 0, tournamentParticipants: 0,
      tournamentMatches: 0, americanoSessions: 0, americanoPlayers: 0,
      americanoRounds: 0, americanoTeams: 0, americanoTeamMatches: 0,
      errors: [] as string[],
    };

    if (clearExisting) await cleanupSeedData(supabase);

    // ── Phase 1: Profiles ────────────────────────────────────────
    console.log(`Phase 1: Creating ${userCount} profiles...`);
    const userIds: string[] = [];
    for (let i = 0; i < userCount; i += batchSize) {
      const batch = [];
      for (let j = 0; j < Math.min(batchSize, userCount - i); j++) {
        const uid = uuid();
        userIds.push(uid);
        batch.push({
          user_id: uid,
          display_name: `${pick(firstNames)} ${pick(lastNames)}`,
          skill_level: pick(skillLevels),
          bio: `SEED_DATA ${pick(bios)}`,
          is_looking_for_team: Math.random() > 0.7,
        });
      }
      const { error } = await supabase.from("profiles").insert(batch);
      if (error) results.errors.push(`Profiles ${i}: ${error.message}`);
      else results.profiles += batch.length;
    }
    console.log(`Created ${results.profiles} profiles`);

    // ── Phase 2: Teams + Team Members ────────────────────────────
    const teamCount = Math.floor(userCount / 2);
    console.log(`Phase 2: Creating ${teamCount} teams...`);
    const teamIds: string[] = [];
    const teamUserMap: { teamId: string; user1: string; user2: string }[] = [];

    for (let i = 0; i < teamCount; i += batchSize) {
      const teamBatch = [];
      const memberBatch = [];
      for (let j = 0; j < Math.min(batchSize, teamCount - i); j++) {
        const idx = (i + j) * 2;
        const teamId = uuid();
        teamIds.push(teamId);
        const u1 = userIds[idx], u2 = userIds[idx + 1];
        teamUserMap.push({ teamId, user1: u1, user2: u2 });

        teamBatch.push({
          id: teamId,
          name: `${pick(adjectives)} ${pick(nouns)} SEED`,
          is_recruiting: Math.random() > 0.8,
          created_by: u1,
        });
        memberBatch.push(
          { team_id: teamId, user_id: u1, is_captain: true },
          { team_id: teamId, user_id: u2, is_captain: false },
        );
      }
      const { error: te } = await supabase.from("teams").insert(teamBatch);
      if (te) results.errors.push(`Teams ${i}: ${te.message}`);
      else results.teams += teamBatch.length;

      const { error: me } = await supabase.from("team_members").insert(memberBatch);
      if (me) results.errors.push(`Members ${i}: ${me.message}`);
      else results.teamMembers += memberBatch.length;
    }
    console.log(`Created ${results.teams} teams, ${results.teamMembers} members`);

    // ── Phase 3: Ladder Rankings ─────────────────────────────────
    console.log("Phase 3: Ladder rankings...");
    const { data: ladderCats } = await supabase
      .from("ladder_categories").select("id").limit(10);
    const catIds = ladderCats?.map((c: any) => c.id) || [];

    if (catIds.length > 0) {
      for (let i = 0; i < teamIds.length; i += batchSize) {
        const batch = [];
        for (let j = 0; j < Math.min(batchSize, teamIds.length - i); j++) {
          batch.push({
            team_id: teamIds[i + j],
            ladder_category_id: pick(catIds),
            rank: 100 + i + j,
            points: randInt(0, 1500),
            wins: randInt(0, 60),
            losses: randInt(0, 40),
            streak: randInt(-5, 15),
          });
        }
        const { error } = await supabase.from("ladder_rankings").insert(batch);
        if (error) results.errors.push(`Rankings ${i}: ${error.message}`);
        else results.ladderRankings += batch.length;
      }
    }
    console.log(`Created ${results.ladderRankings} ladder rankings`);

    // ── Phase 4: Challenges ──────────────────────────────────────
    const challengeCount = Math.min(500, teamIds.length * 2);
    console.log(`Phase 4: Creating ${challengeCount} challenges...`);
    const statusWeights = [
      ...Array(40).fill("pending"),
      ...Array(20).fill("accepted"),
      ...Array(15).fill("declined"),
      ...Array(15).fill("expired"),
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

    // ── Phase 5: Matches ─────────────────────────────────────────
    const matchCount = Math.min(400, teamIds.length * 2);
    console.log(`Phase 5: Creating ${matchCount} matches...`);

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

    // ── Phase 6: Tournament Participants ─────────────────────────
    console.log("Phase 6: Tournament participants...");
    const { data: tournCats } = await supabase
      .from("tournament_categories")
      .select("id, tournament_id, max_teams")
      .limit(20);

    if (tournCats && tournCats.length > 0) {
      const participantBatch = [];
      let teamIdx = 0;
      for (const cat of tournCats) {
        const count = Math.min(cat.max_teams || 8, 15); // up to 15 per category
        for (let k = 0; k < count && teamIdx < teamIds.length; k++, teamIdx++) {
          const tm = teamUserMap[teamIdx];
          participantBatch.push({
            team_id: teamIds[teamIdx],
            tournament_id: cat.tournament_id,
            category_id: cat.id,
            payment_status: Math.random() > 0.3 ? "paid" : "pending",
            seed: k + 1,
            player1_name: `${pick(firstNames)} ${pick(lastNames)}`,
            player2_name: `${pick(firstNames)} ${pick(lastNames)}`,
            custom_team_name: `${pick(adjectives)} ${pick(nouns)} SEED`,
          });
        }
      }

      // Insert in batches
      for (let i = 0; i < participantBatch.length; i += batchSize) {
        const slice = participantBatch.slice(i, i + batchSize);
        const { error } = await supabase.from("tournament_participants").insert(slice);
        if (error) results.errors.push(`TournPart ${i}: ${error.message}`);
        else results.tournamentParticipants += slice.length;
      }
    }
    console.log(`Created ${results.tournamentParticipants} tournament participants`);

    // ── Phase 7: Americano Sessions ──────────────────────────────
    console.log("Phase 7: Americano sessions...");

    // 3 individual sessions
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
      });
      if (se) { results.errors.push(`AmerSession ${s}: ${se.message}`); continue; }
      results.americanoSessions++;

      // 8 players per session
      const playerIds: string[] = [];
      const playerBatch = [];
      for (let p = 0; p < 8; p++) {
        const pid = uuid();
        playerIds.push(pid);
        playerBatch.push({
          id: pid,
          session_id: sessionId,
          player_name: `${pick(firstNames)} ${pick(lastNames)}`,
          user_id: userIds[s * 8 + p] || null,
          total_points: randInt(10, 63),
          matches_played: 3,
        });
      }
      const { error: pe } = await supabase.from("americano_players").insert(playerBatch);
      if (pe) results.errors.push(`AmerPlayers ${s}: ${pe.message}`);
      else results.americanoPlayers += playerBatch.length;

      // 3 rounds with 2 matches each (4v4 split)
      const roundBatch = [];
      for (let r = 1; r <= 3; r++) {
        for (let court = 1; court <= 2; court++) {
          const offset = (court - 1) * 4;
          const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
          const s1 = randInt(5, 21), s2 = randInt(5, 21);
          roundBatch.push({
            session_id: sessionId,
            round_number: r,
            court_number: court,
            team1_player1_id: shuffled[0],
            team1_player2_id: shuffled[1],
            team2_player1_id: shuffled[2],
            team2_player2_id: shuffled[3],
            team1_score: s1,
            team2_score: s2,
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
      });
      if (se) { results.errors.push(`AmerTeamSession ${s}: ${se.message}`); continue; }
      results.americanoSessions++;

      // 6 teams per session
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

      // Round-robin matches (each pair plays once = 15 matches over 5 rounds)
      const matchBatch = [];
      let roundNum = 1;
      for (let i = 0; i < ateamIds.length; i++) {
        for (let j = i + 1; j < ateamIds.length; j++) {
          const s1 = randInt(5, 21), s2 = randInt(5, 21);
          matchBatch.push({
            session_id: sessionId,
            round_number: roundNum,
            court_number: ((matchBatch.length % 3) + 1),
            team1_id: ateamIds[i],
            team2_id: ateamIds[j],
            team1_score: s1,
            team2_score: s2,
            completed_at: new Date(Date.now() - randInt(0, 7) * 86400000).toISOString(),
          });
          if (matchBatch.length % 3 === 0) roundNum++;
        }
      }
      const { error: me } = await supabase.from("americano_team_matches").insert(matchBatch);
      if (me) results.errors.push(`AmerTeamMatches ${s}: ${me.message}`);
      else results.americanoTeamMatches += matchBatch.length;
    }
    console.log(`Created ${results.americanoSessions} sessions, ${results.americanoPlayers} players, ${results.americanoRounds} rounds, ${results.americanoTeams} teams, ${results.americanoTeamMatches} team matches`);

    // ── Summary ──────────────────────────────────────────────────
    const total = Object.entries(results)
      .filter(([k]) => k !== "errors")
      .reduce((sum, [, v]) => sum + (v as number), 0);

    const summary = {
      success: true,
      message: "Seed data created successfully",
      results,
      totalRecords: total,
      timestamp: new Date().toISOString(),
    };

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
