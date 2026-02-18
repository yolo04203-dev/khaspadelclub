import { useState, useEffect } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Users, Loader2, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { AddPartnerDialog } from "@/components/team/AddPartnerDialog";
import { logger } from "@/lib/logger";

const teamSchema = z.object({
  player1Name: z
    .string()
    .min(2, "Your name must be at least 2 characters")
    .max(50, "Name is too long"),
});

type TeamFormData = z.infer<typeof teamSchema>;

export default function CreateTeam() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingTeam, setExistingTeam] = useState<{ id: string; name: string } | null>(null);
  const [checkingTeam, setCheckingTeam] = useState(true);
  const [createdTeam, setCreatedTeam] = useState<{ id: string; name: string } | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      player1Name: "",
    },
  });

  // Pre-fill player name from profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.display_name) {
          form.setValue("player1Name", data.display_name);
        }
      } catch (error) {
        logger.apiError("loadProfile", error);
      }
    };
    loadProfile();
  }, [user]);

  // Check if user already has a team
  useState(() => {
    const checkExistingTeam = async () => {
      if (!user) {
        setCheckingTeam(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("team_members")
          .select(`
            team_id,
            team:teams (
              id,
              name
            )
          `)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data?.team) {
          setExistingTeam(data.team as { id: string; name: string });
        }
      } catch (error) {
        logger.apiError("checkExistingTeam", error);
      } finally {
        setCheckingTeam(false);
      }
    };

    checkExistingTeam();
  });

  const handleSubmit = async (data: TeamFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const tempName = `${data.player1Name.trim()}'s Team`;

      // Call the database function to create team with captain
      const { data: teamId, error } = await supabase.rpc("create_team_with_captain", {
        _name: tempName,
        _avatar_url: null,
      });

      if (error) throw error;

      // Update the captain's profile with player 1 name
      await supabase
        .from("profiles")
        .update({ display_name: data.player1Name.trim() })
        .eq("user_id", user.id);

      toast({
        title: "Team created!",
        description: "Now invite your partner to complete the team.",
      });

      // Store created team info and open invite dialog
      setCreatedTeam({ id: teamId, name: tempName });
      setShowInviteDialog(true);
    } catch (error: any) {
      logger.apiError("createTeam", error);
      toast({
        title: "Failed to create team",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || checkingTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {existingTeam ? (
            // User already has a team
            <Card>
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                  <Users className="w-8 h-8 text-accent" />
                </div>
                <CardTitle>You're already on a team!</CardTitle>
                <CardDescription>
                  You're a member of <strong>{existingTeam.name}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Players can only be on one team at a time. To join a different team,
                  you'll need to leave your current team first.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to="/dashboard">Back to Dashboard</Link>
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link to="/ladders">View Ladders</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Create team form
            <Card>
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Create Your Team</CardTitle>
                <CardDescription>
                  Enter your name to create a team. The team name will be set automatically once your partner joins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="player1Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your name"
                              autoComplete="off"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <h4 className="font-medium text-sm text-foreground">What happens next?</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                          You'll be the team captain
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                          Invite your partner to join
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                          Team name is set automatically (e.g. "Ahmed & Ali")
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                          Choose a ladder and start competing
                        </li>
                      </ul>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating team...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-2" />
                          Create Team
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {createdTeam && (
          <AddPartnerDialog
            open={showInviteDialog}
            onOpenChange={(open) => {
              setShowInviteDialog(open);
            }}
            teamId={createdTeam.id}
            teamName={createdTeam.name}
            captainName={form.getValues("player1Name").trim()}
          />
        )}
      </main>
    </div>
  );
}
