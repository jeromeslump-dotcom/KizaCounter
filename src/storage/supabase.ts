// src/storage/supabase.ts

import { createClient } from "@supabase/supabase-js";

// ============================================================
// CONFIGURATION SUPABASE
// ============================================================

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variables Supabase manquantes : VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY"
  );
}

// ============================================================
// CLIENT SUPABASE
// ============================================================

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);