import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { supabase, type Meal } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { startOfDaysAgo, weeklyBuckets } from "@/lib/nutrition";

export const Route = createFileRoute("/analytics")({
  component: Analytics,
});

function Analytics() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
        .gte("created_at", startOfDaysAgo(6).toISOString());
      if (error) throw error;
      return (data ?? []) as Meal[];
    },
  });

  const data = weeklyBuckets(q.data ?? []);
  const avg = Math.round(data.reduce((s, d) => s + d.cal, 0) / 7);
  const max = Math.max(...data.map((d) => d.cal), 0);

  return (
    <div className="mx-auto max-w-md px-5 pt-10 pb-24">
      <h1 className="mb-6 text-2xl font-bold">Analytics</h1>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#15151b] p-4">
          <p className="text-xs text-white/50">7-day avg</p>
          <p className="mt-1 text-2xl font-bold">{avg}</p>
          <p className="text-xs text-white/40">kcal/day</p>
        </div>
        <div className="rounded-2xl bg-[#15151b] p-4">
          <p className="text-xs text-white/50">Highest day</p>
          <p className="mt-1 text-2xl font-bold">{max}</p>
          <p className="text-xs text-white/40">kcal</p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#15151b] p-4">
        <h2 className="mb-3 text-sm font-semibold text-white/70">This week</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="day" stroke="#ffffff60" fontSize={12} />
              <YAxis stroke="#ffffff60" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#0a0a0f", border: "1px solid #ffffff20", borderRadius: 12 }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="cal" fill="#ff6b35" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}