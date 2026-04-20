export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      tracker_data: {
        Row: {
          data: Json;
          id: string;
          room_code: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          data?: Json;
          id?: string;
          room_code?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          data?: Json;
          id?: string;
          room_code?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
