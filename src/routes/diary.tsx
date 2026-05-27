import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Meal } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { groupByMealType, startOfToday } from "@/lib/nutrition";

export const Route = createFileRoute("/diary")({
  component: Diary,
});

const ICONS: Record<Meal["meal_type"], string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

function Diary() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const mealsQ = useQuery({
    queryKey: ["meals", "today", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", user!.id)
        .gte("consumed_at", startOfToday().toISOString())
        .order("consumed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Meal[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      toast.success("Removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped = groupByMealType(mealsQ.data ?? []);

  return (
    <div className="mx-auto max-w-md px-5 pt-10 pb-24">
      <h1 className="mb-6 text-2xl font-bold">Food Diary</h1>
      <p className="mb-4 text-sm text-white/50">
        {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </p>

      {grouped.map(({ type, items }) => (
        <section key={type} className="mb-5 rounded-3xl bg-[#15151b] p-4">
          <header className="mb-3 flex items-center gap-2">
            <span className="text-xl">{ICONS[type]}</span>
            <h2 className="text-base font-bold capitalize">{type}</h2>
            <span className="ml-auto text-xs text-white/40">
              {items.reduce((s, i) => s + i.calories, 0)} kcal
            </span>
          </header>
          {items.length === 0 ? (
            <p className="py-4 text-center text-xs text-white/30">No entries yet</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {items.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-white/40">
                      {m.calories} kcal · P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fat)}
                    </p>
                  </div>
                  <button
                    onClick={() => del.mutate(m.id)}
                    className="rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <BottomNav />
    </div>
  );
}