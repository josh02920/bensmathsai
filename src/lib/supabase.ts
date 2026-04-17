import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Row type for student_sessions ───────────────────────────────────────────

export interface StudentSession {
  id: string;
  student_name: string;
  topic: string;
  level: string;
  is_correct: boolean;
  wrong_step: number | null;
  explanation: string;
  created_at: string;
}
