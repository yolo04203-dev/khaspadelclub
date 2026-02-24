import { useState } from "react";
import { ArrowUp, ArrowDown, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { AdminEditStatsDialog } from "./AdminEditStatsDialog";

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
  members: { user_id: string; display_name: string | null; avatar_url: string | null }[];
}

interface AdminRankingControlsProps {
  ranking: TeamRanking;
  rankings: TeamRanking[];
  categoryId: string;
  onRankChanged: () => void;
}

export function AdminRankingControls({ ranking, rankings, categoryId, onRankChanged }: AdminRankingControlsProps) {
  const { user } = useAuth();
  const [isMoving, setIsMoving] = useState<"up" | "down" | null>(null);

  const isFirst = ranking.rank === 1;
  const isLast = ranking.rank === Math.max(...rankings.map((r) => r.rank));

  const handleMove = async (direction: "up" | "down") => {
    if (!user || !ranking.team) return;

    const targetRank = direction === "up" ? ranking.rank - 1 : ranking.rank + 1;
    const swapTarget = rankings.find((r) => r.rank === targetRank);
    if (!swapTarget) return;

    setIsMoving(direction);
    try {
      // Swap ranks between the two teams
      const { error: e1 } = await supabase
        .from("ladder_rankings")
        .update({ rank: targetRank })
        .eq("id", ranking.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("ladder_rankings")
        .update({ rank: ranking.rank })
        .eq("id", swapTarget.id);
      if (e2) throw e2;

      // Audit log
      await supabase.from("ladder_audit_log").insert({
        admin_user_id: user.id,
        action: "move_rank",
        team_id: ranking.team.id,
        ladder_category_id: categoryId,
        old_values: { rank: ranking.rank },
        new_values: { rank: targetRank },
        notes: `Swapped rank with ${swapTarget.team?.name || "team"}`,
      });

      onRankChanged();
    } catch (error: any) {
      logger.apiError("moveRank", error);
      toast({ title: "Failed to move team", description: error.message, variant: "destructive" });
    } finally {
      setIsMoving(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <AdminEditStatsDialog
        ranking={ranking}
        categoryId={categoryId}
        onSaved={onRankChanged}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={isFirst || isMoving !== null}
        onClick={() => handleMove("up")}
      >
        {isMoving === "up" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={isLast || isMoving !== null}
        onClick={() => handleMove("down")}
      >
        {isMoving === "down" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDown className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}

export function AdminModeIndicator({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) {
    return (
      <Badge variant="outline" className="gap-1 border-accent text-accent">
        <Shield className="w-3 h-3" />
        Editing Enabled
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      Official Rankings (Admin Controlled)
    </Badge>
  );
}
