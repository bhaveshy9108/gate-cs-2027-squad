import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const hasSupabaseConfig =
  Boolean(supabaseUrl && supabasePublishableKey) &&
  !supabaseUrl.includes("your-project-ref") &&
  !supabasePublishableKey.includes("your-supabase-publishable-key");

export const supabase =
  hasSupabaseConfig
    ? createClient<Database>(supabaseUrl, supabasePublishableKey, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
