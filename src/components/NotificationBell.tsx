import React from "react";
import { Bell, Swords, Calendar, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const NotificationBell = React.memo(function NotificationBell() {
  const { counts, isLoading } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {counts.total > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs",
                "bg-destructive text-destructive-foreground border-0",
                !isLoading && "animate-pulse"
              )}
            >
              {counts.total > 9 ? "9+" : counts.total}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {counts.total === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <>
            {counts.incomingChallenges > 0 && (
              <DropdownMenuItem asChild>
                <Link to="/challenges" className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Swords className="h-4 w-4 text-warning" />
                    <span>New Challenges</span>
                  </div>
                  <Badge variant="secondary" className="bg-warning/20 text-warning">
                    {counts.incomingChallenges}
                  </Badge>
                </Link>
              </DropdownMenuItem>
            )}

            {counts.scheduledMatches > 0 && (
              <DropdownMenuItem asChild>
                <Link to="/challenges" className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-accent" />
                    <span>Scheduled Matches</span>
                  </div>
                  <Badge variant="secondary" className="bg-accent/20 text-accent">
                    {counts.scheduledMatches}
                  </Badge>
                </Link>
              </DropdownMenuItem>
            )}

            {counts.ladderApprovals > 0 && (
              <DropdownMenuItem asChild>
                <Link to="/ladders" className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Join Approved</span>
                  </div>
                  <Badge variant="secondary" className="bg-success/20 text-success">
                    {counts.ladderApprovals}
                  </Badge>
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/challenges" className="text-center justify-center text-sm text-muted-foreground cursor-pointer">
                View All
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
