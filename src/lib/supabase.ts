import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Mostramos advertencia en consola si las credenciales no están configuradas
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')) {
  if (typeof window !== 'undefined') {
    console.warn(
      'Supabase credentials are not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
