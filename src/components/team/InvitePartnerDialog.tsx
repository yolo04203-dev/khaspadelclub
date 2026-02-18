import { useState, useEffect } from "react";
import { Loader2, Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface PlayerSuggestion {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  skill_level: string | null;
}

interface InvitePartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  onInviteSent: () => void;
  initialSearchQuery?: string;
}

export function InvitePartnerDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  onInviteSent,
  initialSearchQuery = "",
}: InvitePartnerDialogProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const searchPlayers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        // Search profiles by display name
        const { data: profiles, error } = await supabase
          .from("public_profiles")
          .select("user_id, display_name, avatar_url, skill_level")
          .ilike("display_name", `%${searchQuery}%`)
          .neq("user_id", user?.id || "")
          .limit(5);

        if (error) throw error;

        setSuggestions(profiles || []);
      } catch (error) {
        logger.apiError("searchPlayers", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchPlayers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  const handleSendInvitation = async () => {
    if (!selectedPlayer || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("team_invitations").insert({
        team_id: teamId,
        invited_user_id: selectedPlayer.user_id,
        invited_by: user.id,
        message: message.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Invitation sent!",
        description: `${selectedPlayer.display_name || "Player"} has been invited to join ${teamName}.`,
      });

      onInviteSent();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setMessage("");
    setSelectedPlayer(null);
    setSuggestions([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Partner to {teamName}
          </DialogTitle>
          <DialogDescription>
            Search for a player to invite to your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search">Find Player</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedPlayer(null);
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Player suggestions */}
          {searchQuery && !selectedPlayer && (
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No players found without a team
                </div>
              ) : (
                suggestions.map((player) => (
                  <button
                    key={player.user_id}
                    type="button"
                    onClick={() => {
                      setSelectedPlayer(player);
                      setSearchQuery(player.display_name || "");
                      setSuggestions([]);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-accent/20 text-accent">
                        {(player.display_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{player.display_name || "Unknown"}</p>
                      {player.skill_level && (
                        <p className="text-xs text-muted-foreground">{player.skill_level}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected player */}
          {selectedPlayer && (
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-md border border-accent/30">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedPlayer.avatar_url || undefined} />
                <AvatarFallback className="bg-accent/20 text-accent">
                  {(selectedPlayer.display_name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{selectedPlayer.display_name || "Unknown"}</p>
                {selectedPlayer.skill_level && (
                  <p className="text-sm text-muted-foreground">{selectedPlayer.skill_level}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPlayer(null);
                  setSearchQuery("");
                }}
              >
                Change
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendInvitation}
            disabled={!selectedPlayer || isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Invitation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
