/* Supabase client — single instance shared across the app.
   Reads URL + anon key from Vite env vars (defined in .env). */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    /* Persist session in localStorage so the user stays logged in across tabs/reloads */
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,   /* picks up OAuth redirects */
  },
});
