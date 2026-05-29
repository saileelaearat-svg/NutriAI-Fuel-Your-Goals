import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Flame, TrendingUp, Trophy, Target } from "lucide-react";
import { supabase, type Meal, type Profile } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { startOfDaysAgo, weeklyBuckets, totals } from "@/lib/nutrition";

export const Route = createFileRoute("/analytics")({
  component: Analytics,
});

function Analytics() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const q = useQuery({
    queryKey: ["meals", "week", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", startOfDaysAgo(6).toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Meal[];
    },
  });

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

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("analytics-meals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meals", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["meals", "week", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const meals = q.data ?? [];
  const data = weeklyBuckets(meals);
  const daysTracked = data.filter((d) => d.cal > 0).length;
  const avg = daysTracked > 0 ? Math.round(data.reduce((s, d) => s + d.cal, 0) / daysTracked) : 0;
  const max = Math.max(...data.map((d) => d.cal), 0);
  const goal = profileQ.data?.daily_calories ?? 2100;

  // Streak: consecutive days from today backwards with any meal logged.
  const streak = useMemo(() => {
    let s = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].cal > 0) s++;
      else break;
    }
    return s;
  }, [data]);

  const onGoalDays = data.filter((d) => d.cal > 0 && d.cal <= goal * 1.05).length;
  const macros = totals(meals);
  const macroData = [
    { name: "Protein", value: Math.round(macros.protein * 4), color: "#3b82f6" },
    { name: "Carbs", value: Math.round(macros.carbs * 4), color: "#10b981" },
    { name: "Fat", value: Math.round(macros.fat * 9), color: "#f59e0b" },
  ].filter((m) => m.value > 0);

  const badges = [
    { id: "first", label: "First meal", earned: meals.length >= 1, icon: Flame },
    { id: "streak3", label: "3-day streak", earned: streak >= 3, icon: TrendingUp },
    { id: "ongoal", label: "On-goal day", earned: onGoalDays >= 1, icon: Target },
    { id: "week", label: "Full week", earned: daysTracked >= 7, icon: Trophy },
  ];

  return (
    <div className="mx-auto max-w-md px-5 pt-10 pb-24">
      <h1 className="mb-1 text-2xl font-bold">Analytics</h1>
      <p className="mb-6 text-sm text-white/50">Last 7 days · live</p>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Avg / day" value={avg} unit="kcal" tint="#ff6b35" />
        <Stat label="Best day" value={max} unit="kcal" tint="#f59e0b" />
        <Stat label="Streak" value={streak} unit={streak === 1 ? "day" : "days"} tint="#10b981" />
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-[#15151b] to-[#1a1015] p-4 shadow-xl shadow-black/30">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80">Calories this week</h2>
          <span className="text-xs text-white/40">Goal {goal}</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="calFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff6b35" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#ff6b35" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
              <XAxis dataKey="day" stroke="#ffffff60" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff60" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#0a0a0f", border: "1px solid #ffffff20", borderRadius: 12 }}
                labelStyle={{ color: "#fff" }}
                formatter={(v: number) => [`${v} kcal`, "Calories"]}
              />
              <Area type="monotone" dataKey="cal" stroke="#ff6b35" strokeWidth={2.5} fill="url(#calFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {macroData.length > 0 && (
        <div className="mt-4 rounded-3xl bg-[#15151b] p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/80">Macro split (kcal)</h2>
          <div className="flex items-center gap-4">
            <div className="h-32 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={macroData} dataKey="value" innerRadius={32} outerRadius={56} paddingAngle={3} stroke="none">
                    {macroData.map((m) => (
                      <Cell key={m.name} fill={m.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {macroData.map((m) => {
                const total = macroData.reduce((s, x) => s + x.value, 0);
                const pct = total > 0 ? Math.round((m.value / total) * 100) : 0;
                return (
                  <div key={m.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                      <span className="text-white/80">{m.name}</span>
                    </span>
                    <span className="text-white/60">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-3xl bg-[#15151b] p-4">
        <h2 className="mb-3 text-sm font-semibold text-white/80">Achievements</h2>
        <div className="grid grid-cols-4 gap-2">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`flex flex-col items-center gap-1 rounded-2xl p-3 text-center transition ${
                b.earned
                  ? "bg-gradient-to-br from-[#ff6b35]/20 to-[#ff3b6b]/10 ring-1 ring-[#ff6b35]/40"
                  : "bg-white/[0.03] opacity-50"
              }`}
            >
              <b.icon size={20} className={b.earned ? "text-[#ff6b35]" : "text-white/40"} />
              <span className="text-[10px] leading-tight text-white/70">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-white/5 bg-gradient-to-br from-[#15151b] to-[#1a1015] p-4">
        <h2 className="mb-2 text-sm font-semibold text-white/80">Insights</h2>
        <ul className="space-y-1.5 text-sm text-white/70">
          {meals.length === 0 ? (
            <li>Log your first meal to unlock personalized insights.</li>
          ) : (
            <>
              <li>
                You've tracked <span className="font-semibold text-white">{daysTracked}</span> of the last 7 days.
              </li>
              <li>
                Daily average is{" "}
                <span className="font-semibold text-white">
                  {avg < goal ? `${goal - avg} kcal below` : `${avg - goal} kcal above`}
                </span>{" "}
                your goal.
              </li>
              {streak >= 2 && (
                <li>
                  🔥 You're on a <span className="font-semibold text-white">{streak}-day streak</span> — keep it going!
                </li>
              )}
            </>
          )}
        </ul>
      </div>

      <BottomNav />
    </div>
  );
}

function Stat({ label, value, unit, tint }: { label: string; value: number; unit: string; tint: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#15151b] p-3">
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="mt-1 text-xl font-extrabold" style={{ color: tint }}>
        {value}
      </p>
      <p className="text-[10px] text-white/40">{unit}</p>
    </div>
  );
}