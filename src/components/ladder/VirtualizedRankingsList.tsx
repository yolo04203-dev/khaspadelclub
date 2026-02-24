import { type CSSProperties, type ReactElement } from "react";
import { List } from "react-window";
import { Trophy, TrendingDown, Flame, Swords, Loader2, Snowflake, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { User } from "@supabase/supabase-js";
import { AdminRankingControls } from "./AdminRankingControls";

interface TeamMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface TeamRanking {
  id: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  streak: number;
  team: {
    id: string;
    name: string;
    avatar_url: string | null;
    is_frozen?: boolean;
    frozen_until?: string | null;
    frozen_reason?: string | null;
  } | null;
  members: TeamMember[];
}

export interface VirtualizedRankingsListProps {
  rankings: TeamRanking[];
  categoryId: string;
  userTeamId: string | null;
  user: User | null;
  isTeamFrozen: (team: TeamRanking["team"]) => boolean;
  getFrozenUntilDate: (team: TeamRanking["team"]) => string | null;
  canChallenge: (targetRank: number, targetTeamId: string, categoryId: string, team: TeamRanking["team"]) => boolean;
  handleChallenge: (targetTeamId: string, targetTeamName: string) => void;
  challengingTeamId: string | null;
  pendingChallenges: Set<string>;
  isAdmin?: boolean;
  onAdminRankChanged?: () => void;
}

function RankBadge({ rank }: { rank: number }) {
  const baseClasses = "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0";
  if (rank === 1) return <div className={cn(baseClasses, "bg-rank-gold/20 text-rank-gold border-2 border-rank-gold/30")}><Trophy className="w-5 h-5" /></div>;
  if (rank === 2) return <div className={cn(baseClasses, "bg-rank-silver/20 text-rank-silver border-2 border-rank-silver/30")}><Trophy className="w-5 h-5" /></div>;
  if (rank === 3) return <div className={cn(baseClasses, "bg-rank-bronze/20 text-rank-bronze border-2 border-rank-bronze/30")}><Trophy className="w-5 h-5" /></div>;
  return <div className={cn(baseClasses, "bg-muted text-muted-foreground")}>{rank}</div>;
}

function getStreakDisplay(streak: number) {
  if (streak === 0) return null;
  if (streak > 0) return <div className="flex items-center gap-1 text-ladder-up"><Flame className="w-4 h-4" /><span className="text-sm font-medium">{streak}W</span></div>;
  return <div className="flex items-center gap-1 text-ladder-down"><TrendingDown className="w-4 h-4" /><span className="text-sm font-medium">{Math.abs(streak)}L</span></div>;
}

// RowProps passed via react-window's rowProps — must NOT contain index/style/ariaAttributes
interface RowExtraProps {
  rankings: TeamRanking[];
  catId: string;
  uTeamId: string | null;
  uObj: User | null;
  frozenCheck: (team: TeamRanking["team"]) => boolean;
  frozenDate: (team: TeamRanking["team"]) => string | null;
  challengeCheck: (targetRank: number, targetTeamId: string, categoryId: string, team: TeamRanking["team"]) => boolean;
  challengeAction: (targetTeamId: string, targetTeamName: string) => void;
  challengingId: string | null;
  pendingSet: Set<string>;
  isAdmin: boolean;
  onAdminRankChanged?: () => void;
}

function RankingRow({ index, style, rankings, catId, uTeamId, uObj, frozenCheck, frozenDate, challengeCheck, challengeAction, challengingId, pendingSet, isAdmin, onAdminRankChanged }: {
  index: number;
  style: CSSProperties;
  ariaAttributes: any;
} & RowExtraProps): ReactElement | null {
  const ranking = rankings[index];
  if (!ranking) return null;

  const isUserTeam = ranking.team?.id === uTeamId;
  const winRate = ranking.wins + ranking.losses > 0 ? Math.round((ranking.wins / (ranking.wins + ranking.losses)) * 100) : 0;

  return (
    <div style={style} className="pb-3 px-0.5">
      <Collapsible>
        <Card className={cn("transition-all hover:shadow-md h-full relative", isUserTeam && "ring-2 ring-accent border-accent", ranking.rank <= 3 && "border-transparent")}>
              {ranking.team && pendingSet.has(ranking.team.id) && (
                <Badge variant="secondary" className="absolute top-2 right-2 text-xs sm:hidden z-10">Pending</Badge>
              )}
          <CardContent className="p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <RankBadge rank={ranking.rank} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{ranking.team?.name || "Unknown Team"}</h3>
                  {isUserTeam && <Badge variant="secondary" className="text-xs">Your Team</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex -space-x-2">
                    {ranking.members.slice(0, 3).map((member) => (
                      <Avatar key={member.user_id} className="w-6 h-6 border-2 border-background">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{member.display_name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {ranking.members.map(m => m.display_name || "Unknown").join(" & ")}
                  </span>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-foreground">{ranking.points}</div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-foreground">{ranking.wins}-{ranking.losses}</div>
                  <div className="text-xs text-muted-foreground">W-L</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-foreground">{winRate}%</div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
                {getStreakDisplay(ranking.streak)}
              </div>

              {uObj && ranking.team && frozenCheck(ranking.team) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="hidden sm:flex gap-1"><Snowflake className="w-3 h-3" />Frozen</Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Team frozen until {frozenDate(ranking.team)}
                      {ranking.team.frozen_reason && ` • ${ranking.team.frozen_reason}`}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Admin controls - desktop */}
              {isAdmin && ranking.team && onAdminRankChanged && (
                <div className="hidden sm:flex">
                  <AdminRankingControls
                    ranking={ranking}
                    rankings={rankings}
                    categoryId={catId}
                    onRankChanged={onAdminRankChanged}
                  />
                </div>
              )}

              {uObj && ranking.team && challengeCheck(ranking.rank, ranking.team.id, catId, ranking.team) && (
                <Button size="sm" variant="outline" className="hidden sm:flex" onClick={() => challengeAction(ranking.team!.id, ranking.team!.name)} disabled={challengingId === ranking.team.id}>
                  {challengingId === ranking.team.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Swords className="w-4 h-4 mr-1" />Challenge</>}
                </Button>
              )}

              {ranking.team && pendingSet.has(ranking.team.id) && <Badge variant="secondary" className="hidden sm:flex">Pending</Badge>}

              <div className="sm:hidden flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="font-semibold text-foreground text-sm">{ranking.points} pts</div>
                  <div className="text-xs text-muted-foreground">{ranking.wins}W-{ranking.losses}L</div>
                </div>
                {uObj && ranking.team && challengeCheck(ranking.rank, ranking.team.id, catId, ranking.team) && (
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => challengeAction(ranking.team!.id, ranking.team!.name)} disabled={challengingId === ranking.team.id}>
                    {challengingId === ranking.team.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                  </Button>
                )}
                
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            <CollapsibleContent className="sm:hidden">
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                  <div><div className="font-semibold text-foreground">{ranking.points}</div><div className="text-xs text-muted-foreground">Points</div></div>
                  <div><div className="font-semibold text-foreground">{ranking.wins}</div><div className="text-xs text-muted-foreground">Wins</div></div>
                  <div><div className="font-semibold text-foreground">{ranking.losses}</div><div className="text-xs text-muted-foreground">Losses</div></div>
                  <div><div className="font-semibold text-foreground">{winRate}%</div><div className="text-xs text-muted-foreground">Win Rate</div></div>
                </div>
                {ranking.streak !== 0 && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {getStreakDisplay(ranking.streak)}
                    <span className="text-sm text-muted-foreground">streak</span>
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Team Members:</p>
                  <div className="flex flex-wrap gap-2">
                    {ranking.members.map((member) => (
                      <div key={member.user_id} className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2 py-1">
                        <Avatar className="w-5 h-5"><AvatarImage src={member.avatar_url || undefined} /><AvatarFallback className="text-xs">{member.display_name?.charAt(0) || "?"}</AvatarFallback></Avatar>
                        <span className="text-xs">{member.display_name || "Unknown"}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Admin controls - mobile */}
                  {isAdmin && ranking.team && onAdminRankChanged && (
                    <div className="w-full flex justify-center mb-2">
                      <AdminRankingControls
                        ranking={ranking}
                        rankings={rankings}
                        categoryId={catId}
                        onRankChanged={onAdminRankChanged}
                      />
                    </div>
                  )}
                  {ranking.team && frozenCheck(ranking.team) && (
                    <Badge variant="secondary" className="flex gap-1 flex-1 justify-center py-2"><Snowflake className="w-3 h-3" />Frozen until {frozenDate(ranking.team)}</Badge>
                  )}
                  {ranking.team && pendingSet.has(ranking.team.id) && <Badge variant="secondary" className="flex-1 justify-center py-2">Challenge Pending</Badge>}
                  {uObj && ranking.team && challengeCheck(ranking.rank, ranking.team.id, catId, ranking.team) && (
                    <Button className="flex-1" onClick={() => challengeAction(ranking.team!.id, ranking.team!.name)} disabled={challengingId === ranking.team.id}>
                      {challengingId === ranking.team.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Swords className="w-4 h-4 mr-2" />Challenge Team</>}
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>
    </div>
  );
}

const ROW_HEIGHT = 88;

export function VirtualizedRankingsList(props: VirtualizedRankingsListProps) {
  const { rankings } = props;

  const rowExtraProps: RowExtraProps = {
    rankings,
    catId: props.categoryId,
    uTeamId: props.userTeamId,
    uObj: props.user,
    frozenCheck: props.isTeamFrozen,
    frozenDate: props.getFrozenUntilDate,
    challengeCheck: props.canChallenge,
    challengeAction: props.handleChallenge,
    challengingId: props.challengingTeamId,
    pendingSet: props.pendingChallenges,
    isAdmin: props.isAdmin ?? false,
    onAdminRankChanged: props.onAdminRankChanged,
  };

  // For small lists, render without virtualization
  if (rankings.length <= 20) {
    return (
      <div className="space-y-3">
        {rankings.map((ranking, index) => (
          <RankingRow
            key={ranking.id}
            index={index}
            style={{}}
            ariaAttributes={{ "aria-posinset": index + 1, "aria-setsize": rankings.length, role: "listitem" as const }}
            {...rowExtraProps}
          />
        ))}
      </div>
    );
  }

  const listHeight = Math.min(rankings.length * ROW_HEIGHT, typeof window !== "undefined" ? window.innerHeight - 300 : 600);

  return (
    <List
      rowComponent={RankingRow}
      rowCount={rankings.length}
      rowHeight={ROW_HEIGHT}
      rowProps={rowExtraProps as any}
      overscanCount={5}
      style={{ height: listHeight }}
    />
  );
}
