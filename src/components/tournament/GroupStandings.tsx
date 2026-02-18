import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface TeamStanding {
  team_id: string;
  team_name: string;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  player1_name?: string;
  player2_name?: string;
}

interface GroupStandingsProps {
  groupName: string;
  teams: TeamStanding[];
  highlightTeamId?: string;
}

export function GroupStandings({ groupName, teams, highlightTeamId }: GroupStandingsProps) {
  // Sort by wins, then point difference
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const diffA = a.points_for - a.points_against;
    const diffB = b.points_for - b.points_against;
    return diffB - diffA;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-4 h-4 text-warning" />
          {groupName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center w-12">W</TableHead>
              <TableHead className="text-center w-12">L</TableHead>
              <TableHead className="text-center w-16">PF</TableHead>
              <TableHead className="text-center w-16">PA</TableHead>
              <TableHead className="text-center w-16">+/-</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTeams.map((team, index) => {
              const isQualifying = index < 2;
              const isHighlighted = team.team_id === highlightTeamId;
              const diff = team.points_for - team.points_against;

              return (
                <TableRow 
                  key={team.team_id} 
                  className={`${isHighlighted ? "bg-primary/10" : ""} ${isQualifying ? "border-l-2 border-l-success" : ""}`}
                >
                  <TableCell className="font-medium">
                    {index + 1}
                    {isQualifying && (
                      <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 text-success border-success">
                        Q
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={isHighlighted ? "font-semibold" : ""}>
                    <div>
                      {team.team_name}
                      {team.player1_name && team.player2_name && (
                        <p className="text-[11px] text-muted-foreground font-normal">
                          {team.player1_name} & {team.player2_name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium text-success">{team.wins}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{team.losses}</TableCell>
                  <TableCell className="text-center">{team.points_for}</TableCell>
                  <TableCell className="text-center">{team.points_against}</TableCell>
                  <TableCell className={`text-center font-medium ${diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : ""}`}>
                    {diff > 0 ? "+" : ""}{diff}
                  </TableCell>
                </TableRow>
              );
            })}
            {sortedTeams.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                  No teams assigned yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
