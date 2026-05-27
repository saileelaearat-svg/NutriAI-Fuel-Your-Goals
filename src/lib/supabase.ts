import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bmcfpsoxujavozydovqn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_oc1bWPRwani7jG3GOj6Lbg_8BSzo2rS";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Meal = {
  id: string;
  user_id: string;
  name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  consumed_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  daily_calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  weight_kg: number | null;
  target_weight_kg: number | null;
};