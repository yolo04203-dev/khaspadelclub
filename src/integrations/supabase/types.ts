export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      americano_players: {
        Row: {
          created_at: string
          id: string
          matches_played: number
          player_name: string
          session_id: string
          total_points: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          matches_played?: number
          player_name: string
          session_id: string
          total_points?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          matches_played?: number
          player_name?: string
          session_id?: string
          total_points?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "americano_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "americano_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      americano_rounds: {
        Row: {
          completed_at: string | null
          court_number: number
          created_at: string
          id: string
          round_number: number
          session_id: string
          team1_player1_id: string
          team1_player2_id: string
          team1_score: number | null
          team2_player1_id: string
          team2_player2_id: string
          team2_score: number | null
        }
        Insert: {
          completed_at?: string | null
          court_number?: number
          created_at?: string
          id?: string
          round_number: number
          session_id: string
          team1_player1_id: string
          team1_player2_id: string
          team1_score?: number | null
          team2_player1_id: string
          team2_player2_id: string
          team2_score?: number | null
        }
        Update: {
          completed_at?: string | null
          court_number?: number
          created_at?: string
          id?: string
          round_number?: number
          session_id?: string
          team1_player1_id?: string
          team1_player2_id?: string
          team1_score?: number | null
          team2_player1_id?: string
          team2_player2_id?: string
          team2_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "americano_rounds_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "americano_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "americano_rounds_team1_player1_id_fkey"
            columns: ["team1_player1_id"]
            isOneToOne: false
            referencedRelation: "americano_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "americano_rounds_team1_player2_id_fkey"
            columns: ["team1_player2_id"]
            isOneToOne: false
            referencedRelation: "americano_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "americano_rounds_team2_player1_id_fkey"
            columns: ["team2_player1_id"]
            isOneToOne: false
            referencedRelation: "americano_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "americano_rounds_team2_player2_id_fkey"
            columns: ["team2_player2_id"]
            isOneToOne: false
            referencedRelation: "americano_players"
            referencedColumns: ["id"]
          },
        ]
      }
      americano_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_round: number
          description: string | null
          id: string
          mode: string
          name: string
          points_per_round: number
          started_at: string | null
          status: Database["public"]["Enums"]["americano_status"]
          total_rounds: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_round?: number
          description?: string | null
          id?: string
          mode?: string
          name: string
          points_per_round?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["americano_status"]
          total_rounds?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_round?: number
          description?: string | null
          id?: string
          mode?: string
          name?: string
          points_per_round?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["americano_status"]
          total_rounds?: number
          updated_at?: string
        }
        Relationships: []
      }
      americano_team_matches: {
        Row: {
          completed_at: string | null
          court_number: number
          created_at: string
          id: string
          round_number: number
          session_id: string
          team1_id: string
          team1_score: number | null
          team2_id: string
          team2_score: number | null
        }
        Insert: {
          completed_at?: string | null
          court_number?: number
          created_at?: string
          id?: string
          round_number: number
          session_id: string
          team1_id: string
          team1_score?: number | null
          team2_id: string
          team2_score?: number | null
        }
        Update: {
          completed_at?: string | null
          court_number?: number
          created_at?: string
          id?: string
          round_number?: number
          session_id?: string
          team1_id?: string
          team1_score?: number | null
          team2_id?: string
          team2_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "americano_team_matches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "americano_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "americano_team_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "americano_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "americano_team_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "americano_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      americano_teams: {
        Row: {
          created_at: string
          id: string
          losses: number
          matches_played: number
          player1_name: string
          player2_name: string
          session_id: string
          team_name: string
          total_points: number
          wins: number
        }
        Insert: {
          created_at?: string
          id?: string
          losses?: number
          matches_played?: number
          player1_name: string
          player2_name: string
          session_id: string
          team_name: string
          total_points?: number
          wins?: number
        }
        Update: {
          created_at?: string
          id?: string
          losses?: number
          matches_played?: number
          player1_name?: string
          player2_name?: string
          session_id?: string
          team_name?: string
          total_points?: number
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "americano_teams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "americano_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenged_team_id: string
          challenger_team_id: string
          created_at: string
          decline_reason: string | null
          expires_at: string
          id: string
          ladder_category_id: string | null
          match_id: string | null
          message: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["challenge_status"]
        }
        Insert: {
          challenged_team_id: string
          challenger_team_id: string
          created_at?: string
          decline_reason?: string | null
          expires_at?: string
          id?: string
          ladder_category_id?: string | null
          match_id?: string | null
          message?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
        }
        Update: {
          challenged_team_id?: string
          challenger_team_id?: string
          created_at?: string
          decline_reason?: string | null
          expires_at?: string
          id?: string
          ladder_category_id?: string | null
          match_id?: string | null
          message?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
        }
        Relationships: [
          {
            foreignKeyName: "challenges_challenged_team_id_fkey"
            columns: ["challenged_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_challenger_team_id_fkey"
            columns: ["challenger_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_ladder_category_id_fkey"
            columns: ["ladder_category_id"]
            isOneToOne: false
            referencedRelation: "ladder_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      ladder_categories: {
        Row: {
          challenge_range: number
          created_at: string
          description: string | null
          display_order: number
          id: string
          ladder_id: string
          name: string
        }
        Insert: {
          challenge_range?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          ladder_id: string
          name: string
        }
        Update: {
          challenge_range?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          ladder_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ladder_categories_ladder_id_fkey"
            columns: ["ladder_id"]
            isOneToOne: false
            referencedRelation: "ladders"
            referencedColumns: ["id"]
          },
        ]
      }
      ladder_join_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          ladder_category_id: string
          message: string | null
          responded_at: string | null
          responded_by: string | null
          status: Database["public"]["Enums"]["ladder_request_status"]
          team_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          ladder_category_id: string
          message?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["ladder_request_status"]
          team_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          ladder_category_id?: string
          message?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["ladder_request_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ladder_join_requests_ladder_category_id_fkey"
            columns: ["ladder_category_id"]
            isOneToOne: false
            referencedRelation: "ladder_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ladder_rankings: {
        Row: {
          created_at: string
          id: string
          ladder_category_id: string | null
          last_match_at: string | null
          losses: number
          points: number
          rank: number
          streak: number
          team_id: string
          updated_at: string
          wins: number
        }
        Insert: {
          created_at?: string
          id?: string
          ladder_category_id?: string | null
          last_match_at?: string | null
          losses?: number
          points?: number
          rank: number
          streak?: number
          team_id: string
          updated_at?: string
          wins?: number
        }
        Update: {
          created_at?: string
          id?: string
          ladder_category_id?: string | null
          last_match_at?: string | null
          losses?: number
          points?: number
          rank?: number
          streak?: number
          team_id?: string
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "ladder_rankings_ladder_category_id_fkey"
            columns: ["ladder_category_id"]
            isOneToOne: false
            referencedRelation: "ladder_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_rankings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ladders: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          max_teams: number
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_teams?: number
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_teams?: number
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          challenged_score: number | null
          challenged_sets: Json | null
          challenged_team_id: string
          challenger_score: number | null
          challenger_sets: Json | null
          challenger_team_id: string
          completed_at: string | null
          created_at: string
          dispute_reason: string | null
          id: string
          notes: string | null
          scheduled_at: string | null
          score_confirmed_by: string | null
          score_disputed: boolean | null
          score_submitted_by: string | null
          sets_won_challenged: number | null
          sets_won_challenger: number | null
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          venue: string | null
          winner_team_id: string | null
        }
        Insert: {
          challenged_score?: number | null
          challenged_sets?: Json | null
          challenged_team_id: string
          challenger_score?: number | null
          challenger_sets?: Json | null
          challenger_team_id: string
          completed_at?: string | null
          created_at?: string
          dispute_reason?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          score_confirmed_by?: string | null
          score_disputed?: boolean | null
          score_submitted_by?: string | null
          sets_won_challenged?: number | null
          sets_won_challenger?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          venue?: string | null
          winner_team_id?: string | null
        }
        Update: {
          challenged_score?: number | null
          challenged_sets?: Json | null
          challenged_team_id?: string
          challenger_score?: number | null
          challenger_sets?: Json | null
          challenger_team_id?: string
          completed_at?: string | null
          created_at?: string
          dispute_reason?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          score_confirmed_by?: string | null
          score_disputed?: boolean | null
          score_submitted_by?: string | null
          sets_won_challenged?: number | null
          sets_won_challenger?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          venue?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_challenged_team_id_fkey"
            columns: ["challenged_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_challenger_team_id_fkey"
            columns: ["challenger_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_looking_for_team: boolean | null
          phone_number: string | null
          preferred_play_times: string[] | null
          skill_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_looking_for_team?: boolean | null
          phone_number?: string | null
          preferred_play_times?: string[] | null
          skill_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_looking_for_team?: boolean | null
          phone_number?: string | null
          preferred_play_times?: string[] | null
          skill_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string | null
          invited_user_id: string | null
          message: string | null
          responded_at: string | null
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email?: string | null
          invited_user_id?: string | null
          message?: string | null
          responded_at?: string | null
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string | null
          invited_user_id?: string | null
          message?: string | null
          responded_at?: string | null
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          is_captain: boolean | null
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_captain?: boolean | null
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_captain?: boolean | null
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          frozen_at: string | null
          frozen_by: string | null
          frozen_reason: string | null
          frozen_until: string | null
          id: string
          is_frozen: boolean | null
          is_recruiting: boolean | null
          name: string
          recruitment_message: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          frozen_until?: string | null
          id?: string
          is_frozen?: boolean | null
          is_recruiting?: boolean | null
          name: string
          recruitment_message?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          frozen_until?: string | null
          id?: string
          is_frozen?: boolean | null
          is_recruiting?: boolean | null
          name?: string
          recruitment_message?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tournament_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          entry_fee: number | null
          id: string
          max_teams: number
          name: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          entry_fee?: number | null
          id?: string
          max_teams?: number
          name: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          entry_fee?: number | null
          id?: string
          max_teams?: number
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_categories_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_groups: {
        Row: {
          category_id: string | null
          created_at: string
          display_order: number
          id: string
          name: string
          tournament_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          name: string
          tournament_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_groups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          category_id: string | null
          completed_at: string | null
          created_at: string
          group_id: string | null
          id: string
          is_losers_bracket: boolean
          match_number: number
          next_match_id: string | null
          round_number: number
          scheduled_at: string | null
          stage: string
          team1_id: string | null
          team1_score: number | null
          team2_id: string | null
          team2_score: number | null
          tournament_id: string
          winner_team_id: string | null
        }
        Insert: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_losers_bracket?: boolean
          match_number: number
          next_match_id?: string | null
          round_number: number
          scheduled_at?: string | null
          stage?: string
          team1_id?: string | null
          team1_score?: number | null
          team2_id?: string | null
          team2_score?: number | null
          tournament_id: string
          winner_team_id?: string | null
        }
        Update: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_losers_bracket?: boolean
          match_number?: number
          next_match_id?: string | null
          round_number?: number
          scheduled_at?: string | null
          stage?: string
          team1_id?: string | null
          team1_score?: number | null
          team2_id?: string | null
          team2_score?: number | null
          tournament_id?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          category_id: string | null
          custom_team_name: string | null
          eliminated_at: string | null
          final_placement: number | null
          group_id: string | null
          group_losses: number
          group_points_against: number
          group_points_for: number
          group_wins: number
          id: string
          is_eliminated: boolean
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_notes: string | null
          payment_status: string | null
          player1_name: string | null
          player2_name: string | null
          registered_at: string
          seed: number | null
          team_id: string
          tournament_id: string
          waitlist_position: number | null
        }
        Insert: {
          category_id?: string | null
          custom_team_name?: string | null
          eliminated_at?: string | null
          final_placement?: number | null
          group_id?: string | null
          group_losses?: number
          group_points_against?: number
          group_points_for?: number
          group_wins?: number
          id?: string
          is_eliminated?: boolean
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          player1_name?: string | null
          player2_name?: string | null
          registered_at?: string
          seed?: number | null
          team_id: string
          tournament_id: string
          waitlist_position?: number | null
        }
        Update: {
          category_id?: string | null
          custom_team_name?: string | null
          eliminated_at?: string | null
          final_placement?: number | null
          group_id?: string | null
          group_losses?: number
          group_points_against?: number
          group_points_for?: number
          group_wins?: number
          id?: string
          is_eliminated?: boolean
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          player1_name?: string | null
          player2_name?: string | null
          registered_at?: string
          seed?: number | null
          team_id?: string
          tournament_id?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          entry_fee: number | null
          entry_fee_currency: string | null
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          max_teams: number
          name: string
          number_of_groups: number | null
          payment_instructions: string | null
          registration_deadline: string | null
          sets_per_match: number
          start_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          updated_at: string
          venue: string | null
          winner_team_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          entry_fee_currency?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_teams?: number
          name: string
          number_of_groups?: number | null
          payment_instructions?: string | null
          registration_deadline?: string | null
          sets_per_match?: number
          start_date?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
          venue?: string | null
          winner_team_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          entry_fee_currency?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_teams?: number
          name?: string
          number_of_groups?: number | null
          payment_instructions?: string | null
          registration_deadline?: string | null
          sets_per_match?: number
          start_date?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
          venue?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_team_with_captain: {
        Args: { _avatar_url?: string; _name: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_team_captain: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      americano_status: "draft" | "in_progress" | "completed" | "cancelled"
      app_role: "admin" | "player"
      challenge_status:
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "cancelled"
      game_mode: "ladder" | "americano" | "tournament"
      ladder_request_status: "pending" | "approved" | "rejected"
      match_status:
        | "pending"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      tournament_format:
        | "single_elimination"
        | "double_elimination"
        | "round_robin"
      tournament_status:
        | "draft"
        | "registration"
        | "in_progress"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      americano_status: ["draft", "in_progress", "completed", "cancelled"],
      app_role: ["admin", "player"],
      challenge_status: [
        "pending",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ],
      game_mode: ["ladder", "americano", "tournament"],
      ladder_request_status: ["pending", "approved", "rejected"],
      match_status: [
        "pending",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      tournament_format: [
        "single_elimination",
        "double_elimination",
        "round_robin",
      ],
      tournament_status: [
        "draft",
        "registration",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
