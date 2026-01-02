
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Connect to your Supabase project.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jkuybndifytwuxcmawfk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdXlibmRpZnl0d3V4Y21hd2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MzcxMzEsImV4cCI6MjA3NzUxMzEzMX0.AWWsrC9KDdvclY8oJGpH7P2q5D1cKhSPj8HsQ0vx2Y8';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
