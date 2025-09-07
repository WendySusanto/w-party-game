// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Generic types
export interface Game {
  id: string;
  name: string;
  description: string;
  slug: string;
  min_players: number;
  max_players: number;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  code: string;
  game_id: string;
  status: "waiting" | "in_progress";
  state: any; // JSON to store game state
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  is_turn: boolean;
  is_loser: boolean;
  extra: any; //JSON to store extra data for player
  is_host: boolean;
  created_at: string;
}
