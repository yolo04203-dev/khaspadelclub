/**
 * CSV export utilities for Tournament and Americano match data.
 * Uses Blob + anchor click for cross-platform download (web, Android WebView, iOS Safari).
 */

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map(row => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Tournament Export ──────────────────────────────────────

interface TournamentMatchExport {
  id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_team_id: string | null;
  group_id: string | null;
  category_id: string | null;
  stage: string;
  scheduled_at: string | null;
  court_number: number | null;
}

interface ParticipantExport {
  team_id: string;
  team_name?: string;
  custom_team_name: string | null;
  player1_name: string | null;
  player2_name: string | null;
}

interface GroupExport {
  id: string;
  name: string;
}

interface TournamentExport {
  name: string;
  venue: string | null;
}

export function exportTournamentMatchesCSV(
  matches: TournamentMatchExport[],
  participants: ParticipantExport[],
  groups: GroupExport[],
  tournament: TournamentExport,
  categoryName?: string,
  onWarning?: (msg: string) => void,
) {
  // Warn about missing scheduling data
  const missingCourt = matches.filter(m => m.court_number == null).length;
  const missingTime = matches.filter(m => !m.scheduled_at).length;
  if ((missingCourt > 0 || missingTime > 0) && onWarning) {
    const parts: string[] = [];
    if (missingCourt > 0) parts.push(`${missingCourt} missing court`);
    if (missingTime > 0) parts.push(`${missingTime} missing time`);
    onWarning(`${parts.join(", ")} out of ${matches.length} matches.`);
  }
  const teamMap = new Map<string, ParticipantExport>();
  for (const p of participants) {
    teamMap.set(p.team_id, p);
  }
  const groupMap = new Map<string, string>();
  for (const g of groups) {
    groupMap.set(g.id, g.name);
  }

  const getTeamName = (id: string | null) => {
    if (!id) return "TBD";
    const p = teamMap.get(id);
    return p?.custom_team_name || p?.team_name || "Unknown";
  };
  const getPlayers = (id: string | null) => {
    if (!id) return "";
    const p = teamMap.get(id);
    return [p?.player1_name, p?.player2_name].filter(Boolean).join(" & ");
  };
  const getWinner = (winnerId: string | null) => {
    if (!winnerId) return "";
    return getTeamName(winnerId);
  };
  const getStageLabel = (m: TournamentMatchExport) => {
    if (m.stage === "group") return groupMap.get(m.group_id || "") || "Group";
    return m.stage.charAt(0).toUpperCase() + m.stage.slice(1);
  };

  const header = ["Stage", "Round", "Match #", "Team 1", "Team 1 Players", "Team 2", "Team 2 Players", "Score", "Winner", "Category", "Venue", "Court", "Date", "Time"];
  const rows: string[][] = [header];

  for (const m of matches) {
    const score = m.team1_score !== null && m.team2_score !== null
      ? `${m.team1_score} - ${m.team2_score}`
      : "";
    rows.push([
      getStageLabel(m),
      String(m.round_number),
      String(m.match_number),
      getTeamName(m.team1_id),
      getPlayers(m.team1_id),
      getTeamName(m.team2_id),
      getPlayers(m.team2_id),
      score,
      getWinner(m.winner_team_id),
      categoryName || "",
      tournament.venue || "",
      m.court_number ? String(m.court_number) : "",
      formatDate(m.scheduled_at),
      formatTime(m.scheduled_at),
    ]);
  }

  const safeName = tournament.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  downloadCsv(rows, `khas-padel-${safeName}-matches.csv`);
}

// ─── Americano Export ───────────────────────────────────────

interface AmericanoTeamExport {
  id: string;
  team_name: string;
  player1_name: string;
  player2_name: string;
}

interface AmericanoTeamMatchExport {
  round_number: number;
  court_number: number;
  team1_id: string;
  team2_id: string;
  team1_score: number | null;
  team2_score: number | null;
  completed_at: string | null;
}

interface AmericanoPlayerExport {
  id: string;
  player_name: string;
}

interface AmericanoRoundExport {
  round_number: number;
  court_number: number;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  team1_score: number | null;
  team2_score: number | null;
  completed_at: string | null;
}

interface AmericanoSessionExport {
  name: string;
  mode: string;
}

export function exportAmericanoTeamMatchesCSV(
  matches: AmericanoTeamMatchExport[],
  teams: AmericanoTeamExport[],
  session: AmericanoSessionExport,
  onWarning?: (msg: string) => void,
) {
  const missingCourt = matches.filter(m => !m.court_number).length;
  if (missingCourt > 0 && onWarning) {
    onWarning(`${missingCourt} of ${matches.length} matches are missing court assignments.`);
  }
  const teamMap = new Map<string, AmericanoTeamExport>();
  for (const t of teams) teamMap.set(t.id, t);

  const header = ["Round", "Court", "Team 1", "Team 1 Players", "Team 2", "Team 2 Players", "Team 1 Score", "Team 2 Score", "Status"];
  const rows: string[][] = [header];

  for (const m of matches) {
    const t1 = teamMap.get(m.team1_id);
    const t2 = teamMap.get(m.team2_id);
    rows.push([
      String(m.round_number),
      String(m.court_number),
      t1?.team_name || "Unknown",
      t1 ? `${t1.player1_name} & ${t1.player2_name}` : "",
      t2?.team_name || "Unknown",
      t2 ? `${t2.player1_name} & ${t2.player2_name}` : "",
      m.team1_score !== null ? String(m.team1_score) : "",
      m.team2_score !== null ? String(m.team2_score) : "",
      m.completed_at ? "Completed" : "Pending",
    ]);
  }

  const safeName = session.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  downloadCsv(rows, `khas-padel-${safeName}-matches.csv`);
}

export function exportAmericanoRoundsCSV(
  rounds: AmericanoRoundExport[],
  players: AmericanoPlayerExport[],
  session: AmericanoSessionExport,
  onWarning?: (msg: string) => void,
) {
  const missingCourt = rounds.filter(r => !r.court_number).length;
  if (missingCourt > 0 && onWarning) {
    onWarning(`${missingCourt} of ${rounds.length} rounds are missing court assignments.`);
  }
  const playerMap = new Map<string, string>();
  for (const p of players) playerMap.set(p.id, p.player_name);

  const header = ["Round", "Court", "Team 1", "Team 2", "Team 1 Score", "Team 2 Score", "Status"];
  const rows: string[][] = [header];

  for (const r of rounds) {
    const t1 = `${playerMap.get(r.team1_player1_id) || "?"} & ${playerMap.get(r.team1_player2_id) || "?"}`;
    const t2 = `${playerMap.get(r.team2_player1_id) || "?"} & ${playerMap.get(r.team2_player2_id) || "?"}`;
    rows.push([
      String(r.round_number),
      String(r.court_number),
      t1,
      t2,
      r.team1_score !== null ? String(r.team1_score) : "",
      r.team2_score !== null ? String(r.team2_score) : "",
      r.completed_at ? "Completed" : "Pending",
    ]);
  }

  const safeName = session.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  downloadCsv(rows, `khas-padel-${safeName}-matches.csv`);
}
