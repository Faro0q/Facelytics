// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_CLIENT_KEY!; // updated var name

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // frontend app doesn’t need session storage
  },
});
