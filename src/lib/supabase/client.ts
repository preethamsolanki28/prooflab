import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://opwfsjflhoczeyllhcrf.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseAnonKey && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in browser environment.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
