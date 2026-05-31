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
  food_name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  auth_user_id: string;
  name: string | null;
  full_name: string | null;
  email: string | null;
  daily_calories: number;
  current_weight: number | null;
  target_weight: number | null;
  created_at: string;
  updated_at: string;
};