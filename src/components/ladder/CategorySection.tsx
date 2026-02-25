import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VirtualizedRankingsList } from "@/components/ladder/VirtualizedRankingsList";
import type { User } from "@supabase/supabase-js";

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

interface LadderCategory {
  id: string;
  name: string;
  description: string | null;
  challenge_range: number;
  rankings: TeamRanking[];
}

interface CategorySectionProps {
  category: LadderCategory;
  userTeamId: string | null;
  user: User | null;
  isTeamFrozen: (team: TeamRanking["team"]) => boolean;
  getFrozenUntilDate: (team: TeamRanking["team"]) => string | null;
  canChallenge: (targetRank: number, targetTeamId: string, categoryId: string, team: TeamRanking["team"]) => boolean;
  handleChallenge: (targetTeamId: string, targetTeamName: string) => Promise<void>;
  challengingTeamId: string | null;
  pendingChallenges: Set<string>;
  isAdmin: boolean;
  onAdminRankChanged: () => void;
}

export function CategorySection({
  category,
  userTeamId,
  user,
  isTeamFrozen,
  getFrozenUntilDate,
  canChallenge,
  handleChallenge,
  challengingTeamId,
  pendingChallenges,
  isAdmin,
  onAdminRankChanged,
}: CategorySectionProps) {
  return (
    <div>
      {category.description && (
        <p className="text-center text-muted-foreground mb-4 md:mb-6">{category.description}</p>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 md:mb-8 max-w-md mx-auto">
        <Card className="text-center">
          <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{category.rankings.length}</div>
            <div className="text-xs text-muted-foreground">Teams</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {category.rankings.reduce((sum, r) => sum + r.wins + r.losses, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Matches</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{category.challenge_range}</div>
            <div className="text-xs text-muted-foreground">Challenge Range</div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings List */}
      {category.rankings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No teams yet</h3>
            <p className="text-muted-foreground">Be the first to join this category!</p>
          </CardContent>
        </Card>
      ) : (
        <VirtualizedRankingsList
          rankings={category.rankings}
          categoryId={category.id}
          userTeamId={userTeamId}
          user={user}
          isTeamFrozen={isTeamFrozen}
          getFrozenUntilDate={getFrozenUntilDate}
          canChallenge={canChallenge}
          handleChallenge={handleChallenge}
          challengingTeamId={challengingTeamId}
          pendingChallenges={pendingChallenges}
          isAdmin={isAdmin}
          onAdminRankChanged={onAdminRankChanged}
        />
      )}
    </div>
  );
}
