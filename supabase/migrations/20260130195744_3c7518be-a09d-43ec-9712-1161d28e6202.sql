-- Enable realtime for ladder_rankings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.ladder_rankings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;