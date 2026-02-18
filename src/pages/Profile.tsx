import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Users, Trophy, Loader2, Save, Trash2 } from "lucide-react";
import { ReportProblemDialog } from "@/components/ReportProblemDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { logger } from "@/lib/logger";
import { InvitePartnerDialog } from "@/components/team/InvitePartnerDialog";
import { PendingInvitations } from "@/components/team/PendingInvitations";
import { TeamRecruitmentToggle } from "@/components/team/TeamRecruitmentToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  skill_level: string | null;
  phone_number: string | null;
  bio: string | null;
  is_looking_for_team: boolean;
  preferred_play_times: string[] | null;
}

interface UserTeam {
  id: string;
  name: string;
  rank: number | null;
  is_captain: boolean;
  is_recruiting: boolean;
  recruitment_message: string | null;
}

interface MatchHistory {
  id: string;
  opponent_name: string;
  result: "win" | "loss";
  score: string;
  date: string;
}

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Pro"];
const PLAY_TIMES = ["Weekday Mornings", "Weekday Evenings", "Weekend Mornings", "Weekend Evenings"];

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form state
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [isLookingForTeam, setIsLookingForTeam] = useState(false);
  const [preferredPlayTimes, setPreferredPlayTimes] = useState<string[]>([]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Parallel fetch: profile + team membership
      const [profileResult, memberResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, avatar_url, skill_level, phone_number, bio, is_looking_for_team, preferred_play_times")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("team_members")
          .select("team_id, is_captain")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const { data: profileData, error: profileError } = profileResult;
      if (profileError && profileError.code !== "PGRST116") {
        logger.apiError("fetchProfile", profileError);
      }

      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || "");
        setAvatarUrl(profileData.avatar_url);
        setSkillLevel(profileData.skill_level || "");
        setPhoneNumber(profileData.phone_number || "");
        setBio(profileData.bio || "");
        setIsLookingForTeam(profileData.is_looking_for_team || false);
        setPreferredPlayTimes(profileData.preferred_play_times || []);
      } else {
        setDisplayName(user.user_metadata?.display_name || user.email?.split("@")[0] || "");
      }

      const memberData = memberResult.data;

      if (memberData) {
        // Parallel fetch: team details, rank, and match history
        const [teamResult, rankResult, matchesResult] = await Promise.all([
          supabase
            .from("teams")
            .select("id, name, is_recruiting, recruitment_message")
            .eq("id", memberData.team_id)
            .single(),
          supabase
            .from("ladder_rankings")
            .select("rank")
            .eq("team_id", memberData.team_id)
            .order("rank", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("matches")
            .select("id, challenger_team_id, challenged_team_id, challenger_score, challenged_score, winner_team_id, completed_at")
            .or(`challenger_team_id.eq.${memberData.team_id},challenged_team_id.eq.${memberData.team_id}`)
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(10),
        ]);

        const teamData = teamResult.data;
        const rankData = rankResult.data;
        const matches = matchesResult.data;

        if (teamData) {
          setUserTeam({
            id: teamData.id,
            name: teamData.name,
            rank: rankData?.rank || null,
            is_captain: memberData.is_captain || false,
            is_recruiting: teamData.is_recruiting || false,
            recruitment_message: teamData.recruitment_message || null,
          });
        }

        if (matches && matches.length > 0) {
          const teamIds = [...new Set(matches.flatMap(m => [m.challenger_team_id, m.challenged_team_id]))];
          const { data: teams } = await supabase
            .from("teams")
            .select("id, name")
            .in("id", teamIds);

          const teamsMap = new Map(teams?.map(t => [t.id, t.name]) || []);

          setMatchHistory(matches.map(m => {
            const isChallenger = m.challenger_team_id === memberData.team_id;
            const opponentId = isChallenger ? m.challenged_team_id : m.challenger_team_id;
            const myScore = isChallenger ? m.challenger_score : m.challenged_score;
            const theirScore = isChallenger ? m.challenged_score : m.challenger_score;
            
            return {
              id: m.id,
              opponent_name: teamsMap.get(opponentId) || "Unknown",
              result: m.winner_team_id === memberData.team_id ? "win" : "loss",
              score: `${myScore || 0} - ${theirScore || 0}`,
              date: m.completed_at ? new Date(m.completed_at).toLocaleDateString() : "N/A",
            };
          }));
        }
      } else {
        setUserTeam(null);
      }
    } catch (error) {
      logger.apiError("fetchProfileData", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          skill_level: skillLevel || null,
          phone_number: phoneNumber || null,
          bio: bio || null,
          is_looking_for_team: isLookingForTeam,
          preferred_play_times: preferredPlayTimes.length > 0 ? preferredPlayTimes : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!user || !userTeam) return;
    
    if (userTeam.is_captain) {
      toast({
        title: "Cannot leave team",
        description: "As team captain, you must transfer ownership or delete the team first.",
        variant: "destructive",
      });
      return;
    }

    setIsLeavingTeam(true);

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("user_id", user.id)
        .eq("team_id", userTeam.id);

      if (error) throw error;

      toast({
        title: "Left team",
        description: `You have left ${userTeam.name}.`,
      });
      setUserTeam(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLeavingTeam(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await supabase.auth.signOut();
      navigate("/");
    } catch (error: any) {
      logger.apiError("deleteAccount", error);
      toast({ title: "Error", description: "Failed to delete account. Please try again.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const togglePlayTime = (time: string) => {
    setPreferredPlayTimes(prev => 
      prev.includes(time) 
        ? prev.filter(t => t !== time)
        : [...prev, time]
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader showBack />
        <main className="container py-8 max-w-2xl pb-safe-nav sm:pb-8">
          <div className="mb-8 text-center">
            <Skeleton className="h-8 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <div className="space-y-6">
            {/* Account Info skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <Skeleton className="h-8 w-28 rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
              </CardContent>
            </Card>
            {/* Team skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-24 rounded-md" />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBack />

      <main className="container py-8 max-w-2xl pb-safe-nav sm:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile</h1>
            <p className="text-muted-foreground">Manage your account settings</p>
          </div>

          <div className="space-y-6">
            {/* Team Invitations */}
            <PendingInvitations onAccepted={fetchData} />

            {/* Avatar & Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <AvatarUpload
                  currentAvatarUrl={avatarUrl}
                  displayName={displayName}
                  userId={user.id}
                  onUploadComplete={(url) => setAvatarUrl(url)}
                />

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skillLevel">Skill Level</Label>
                  <Select value={skillLevel} onValueChange={setSkillLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your skill level" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 200))}
                    placeholder="Tell others about yourself..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {bio.length}/200
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Your phone number"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="lookingForTeam">Looking for a team</Label>
                    <p className="text-sm text-muted-foreground">
                      Let others know you're available
                    </p>
                  </div>
                  <Switch
                    id="lookingForTeam"
                    checked={isLookingForTeam}
                    onCheckedChange={setIsLookingForTeam}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preferred Play Times</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLAY_TIMES.map(time => (
                      <Button
                        key={time}
                        type="button"
                        variant={preferredPlayTimes.includes(time) ? "default" : "outline"}
                        size="sm"
                        onClick={() => togglePlayTime(time)}
                        className="justify-start"
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Team Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userTeam ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{userTeam.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {userTeam.rank ? `Rank #${userTeam.rank}` : "Unranked"}
                          {userTeam.is_captain && " • Captain"}
                        </p>
                      </div>
                      <Button asChild variant="outline">
                        <Link to="/ladders">View Ladder</Link>
                      </Button>
                    </div>
                    
                    {userTeam.is_captain && (
                      <div className="border-t pt-4">
                        <TeamRecruitmentToggle
                          teamId={userTeam.id}
                          initialIsRecruiting={userTeam.is_recruiting}
                          initialRecruitmentMessage={userTeam.recruitment_message}
                          onUpdated={fetchData}
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      {userTeam.is_captain && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => setInviteDialogOpen(true)}
                        >
                          Invite Partner
                        </Button>
                      )}
                      {!userTeam.is_captain && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleLeaveTeam}
                          disabled={isLeavingTeam}
                        >
                          {isLeavingTeam ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : null}
                          Leave Team
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">You're not on a team yet</p>
                    <Button asChild>
                      <Link to="/teams/create">Create Team</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Match History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Match History
                </CardTitle>
                <CardDescription>
                  Your recent matches • <Link to="/stats" className="text-accent hover:underline">View detailed stats</Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matchHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No matches played yet</p>
                ) : (
                  <div className="space-y-2">
                    {matchHistory.map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${match.result === "win" ? "bg-success" : "bg-destructive"}`} />
                          <div>
                            <p className="font-medium text-foreground">vs {match.opponent_name}</p>
                            <p className="text-xs text-muted-foreground">{match.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{match.score}</p>
                          <p className={`text-xs ${match.result === "win" ? "text-success" : "text-destructive"}`}>
                            {match.result === "win" ? "Won" : "Lost"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Support & Account Actions */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <ReportProblemDialog />
                <Button variant="destructive" className="w-full justify-start" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>

      {/* Invite Dialog */}
      {userTeam && (
        <InvitePartnerDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          teamId={userTeam.id}
          teamName={userTeam.name}
          onInviteSent={fetchData}
        />
      )}

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your profile, team memberships, and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
