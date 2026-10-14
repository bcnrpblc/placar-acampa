export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_identifier: string | null
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          admin_identifier?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          admin_identifier?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      daily_snapshots: {
        Row: {
          created_at: string | null
          day: string
          event_id: string
          id: string
          locked_by: string | null
          snapshot: Json
        }
        Insert: {
          created_at?: string | null
          day: string
          event_id: string
          id?: string
          locked_by?: string | null
          snapshot: Json
        }
        Update: {
          created_at?: string | null
          day?: string
          event_id?: string
          id?: string
          locked_by?: string | null
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "daily_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          final_snapshot: Json | null
          id: string
          scoring_mode: Database["public"]["Enums"]["scoring_mode"]
          slug: string
          starts_at: string | null
          subtitle: string | null
          status: Database["public"]["Enums"]["event_status"]
          theme: Json | null
          reveal_texts: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          final_snapshot?: Json | null
          id?: string
          scoring_mode?: Database["public"]["Enums"]["scoring_mode"]
          slug: string
          starts_at?: string | null
          subtitle?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          theme?: Json | null
          reveal_texts?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          final_snapshot?: Json | null
          id?: string
          scoring_mode?: Database["public"]["Enums"]["scoring_mode"]
          slug?: string
          starts_at?: string | null
          subtitle?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          theme?: Json | null
          reveal_texts?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          slug: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          slug: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          event_id: string
          id: string
          name: string
          name_key: string
          phone: string | null
          team_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          name: string
          name_key: string
          phone?: string | null
          team_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          name?: string
          name_key?: string
          phone?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      rounds: {
        Row: {
          created_at: string | null
          day: string
          game_id: string
          id: string
          metadata: Json | null
          round_number: number | null
        }
        Insert: {
          created_at?: string | null
          day: string
          game_id: string
          id?: string
          metadata?: Json | null
          round_number?: number | null
        }
        Update: {
          created_at?: string | null
          day?: string
          game_id?: string
          id?: string
          metadata?: Json | null
          round_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      score_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          meta: Json | null
          player_id: string | null
          points: number
          reason: string | null
          round_id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          meta?: Json | null
          player_id?: string | null
          points: number
          reason?: string | null
          round_id: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          meta?: Json | null
          player_id?: string | null
          points?: number
          reason?: string | null
          round_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_entries_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_aggregates: {
        Row: {
          event_id: string
          last_updated: string | null
          team_id: string
          total_points: number
        }
        Insert: {
          event_id: string
          last_updated?: string | null
          team_id: string
          total_points?: number
        }
        Update: {
          event_id?: string
          last_updated?: string | null
          team_id?: string
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_aggregates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_aggregates_team_id_fkey"
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
          color: string
          created_at: string | null
          event_id: string
          id: string
          name: string
          photo_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          color: string
          created_at?: string | null
          event_id: string
          id?: string
          name: string
          photo_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          color?: string
          created_at?: string | null
          event_id?: string
          id?: string
          name?: string
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      game_team_scores: {
        Row: {
          event_id: string | null
          game_id: string | null
          game_title: string | null
          team_avatar: string | null
          team_color: string | null
          team_id: string | null
          team_name: string | null
          total_points: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_add_role: {
        Args: {
          role_to_add: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      admin_remove_role: {
        Args: {
          role_to_remove: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      end_event: {
        Args: { target_event_id: string }
        Returns: boolean
      }
      event_is_writable: {
        Args: { _event_id: string }
        Returns: boolean
      }
      get_players_public: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          name: string
          team_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_team_points: {
        Args: {
          points_to_add: number
          target_event_id: string
          target_team_id: string
        }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_superadmin: {
        Args: { _user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      event_status: "draft" | "live" | "ended"
      scoring_mode: "team" | "individual"
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
      app_role: ["admin", "moderator", "user"],
      event_status: ["draft", "live", "ended"],
      scoring_mode: ["team", "individual"],
    },
  },
} as const
