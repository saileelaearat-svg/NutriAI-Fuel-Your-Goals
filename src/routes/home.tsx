import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Plus, Droplet } from "lucide-react";
import { supabase, type Meal, type Profile } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Ring } from "@/components/Ring";
import { BottomNav } from "@/components/BottomNav";
import { totals, startOfToday } from "@/lib/nutrition";

export const Route = createFileRoute("/home")({
  component: Home,
});

function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const profileQ = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const todayMealsQ = useQuery({
    queryKey: ["meals", "today", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Meal[]> => {
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", user!.id)
        .gte("consumed_at", startOfToday().toISOString())
        .order("consumed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Meal[];
    },
  });

  // Realtime: refetch on meal changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("meals-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meals", filter: `user_id=eq.${user.id}` },
        () => todayMealsQ.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, todayMealsQ]);

  const profile = profileQ.data;
  const goal = profile?.daily_calorie_goal ?? 2100;
  const proteinGoal = profile?.protein_goal ?? 150;
  const carbsGoal = profile?.carbs_goal ?? 220;
  const fatGoal = profile?.fat_goal ?? 70;
  const t = totals(todayMealsQ.data ?? []);
  const remaining = Math.max(0, goal - t.calories);
  const pct = goal > 0 ? (t.calories / goal) * 100 : 0;

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-white/50">Welcome back</p>
          <h1 className="text-2xl font-bold">
            {profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Friend"} 👋
          </h1>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ff3b6b] font-bold">
          {(profile?.full_name ?? user?.email ?? "U")[0].toUpperCase()}
        </div>
      </header>

      <section className="rounded-3xl bg-gradient-to-br from-[#15151b] to-[#1a1015] p-6 shadow-xl">
        <div className="flex flex-col items-center">
          <Ring pct={pct} size={200} stroke={14}>
            <span className="text-4xl font-extrabold">{Math.round(t.calories)}</span>
            <span className="text-xs text-white/50">/ {goal} kcal</span>
            <span className="mt-1 text-xs font-medium text-[#ff6b35]">
              {remaining} left
            </span>
          </Ring>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Macro label="Protein" value={t.protein} goal={proteinGoal} color="#3b82f6" />
          <Macro label="Carbs" value={t.carbs} goal={carbsGoal} color="#10b981" />
          <Macro label="Fat" value={t.fat} goal={fatGoal} color="#f59e0b" />
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          to="/scanner"
          className="flex flex-col items-center gap-2 rounded-2xl bg-[#ff6b35] p-5 font-semibold shadow-lg shadow-[#ff6b35]/30 transition active:scale-95"
        >
          <Camera />
          Scan Food
        </Link>
        <Link
          to="/diary"
          className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#15151b] p-5 font-semibold transition active:scale-95"
        >
          <Plus />
          Open Diary
        </Link>
      </div>

      <WaterCard userId={user?.id} />

      <BottomNav />
    </div>
  );
}

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="rounded-2xl bg-black/30 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-white/60">{label}</span>
        <span className="text-xs font-medium">{Math.round(value)}g</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="mt-1 text-[10px] text-white/40">of {goal}g</p>
    </div>
  );
}

function WaterCard({ userId }: { userId?: string }) {
  const q = useQuery({
    queryKey: ["water", "today", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("water_intake")
        .select("glasses")
        .eq("user_id", userId!)
        .gte("logged_at", startOfToday().toISOString());
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + (r.glasses ?? 0), 0);
    },
  });

  const total = q.data ?? 0;
  const goal = 8;

  async function addGlass() {
    if (!userId) return;
    await supabase.from("water_intake").insert({ user_id: userId, glasses: 1 });
    q.refetch();
  }

  return (
    <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#15151b] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
          <Droplet size={18} className="text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">Water</p>
          <p className="text-xs text-white/50">
            {total} / {goal} glasses
          </p>
        </div>
      </div>
      <button
        onClick={addGlass}
        className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold transition active:scale-95"
      >
        +1
      </button>
    </div>
  );
}