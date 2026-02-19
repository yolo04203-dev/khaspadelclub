import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Banknote, Crown, ChevronRight } from "lucide-react";

interface TournamentCategoryCardProps {
  name: string;
  venue?: string | null;
  teamsJoined: number;
  maxTeams: number;
  entryFee: number;
  currency: string;
  winnerName?: string | null;
  onClick: () => void;
}

export function TournamentCategoryCard({
  name,
  venue,
  teamsJoined,
  maxTeams,
  entryFee,
  currency,
  winnerName,
  onClick,
}: TournamentCategoryCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.99]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold text-foreground">{name}</h3>

            {venue && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{venue}</span>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{teamsJoined}/{maxTeams} Joined</span>
              </div>

              {entryFee > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Banknote className="w-3.5 h-3.5" />
                  <span>{currency} {entryFee.toLocaleString()} Per team</span>
                </div>
              )}
            </div>

            {winnerName && (
              <div className="flex items-center gap-1.5 mt-1">
                <Crown className="w-4 h-4 text-rank-gold" />
                <span className="text-sm font-medium text-foreground">{winnerName} 🏆</span>
              </div>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
