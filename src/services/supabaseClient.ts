
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Connect to your Supabase project using Environment Variables.
// These must be set in your Cloudflare Pages dashboard.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Please check your Environment Variables.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
