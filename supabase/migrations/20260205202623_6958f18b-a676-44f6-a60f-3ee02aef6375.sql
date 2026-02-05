-- Enable realtime for tournament tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;