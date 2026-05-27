import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Meal } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/result")({
  component: Result,
});

type Food = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function Result() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [food, setFood] = useState<Food | null>(null);
  const [mealType, setMealType] = useState<Meal["meal_type"]>(() => {
    const h = new Date().getHours();
    if (h < 11) return "breakfast";
    if (h < 15) return "lunch";
    if (h < 20) return "dinner";
    return "snack";
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("nutriai:lastScan");
    if (!raw) {
      navigate({ to: "/scanner" });
      return;
    }
    try {
      setFood(JSON.parse(raw));
    } catch {
      navigate({ to: "/scanner" });
    }
  }, [navigate]);

  async function save() {
    if (!user || !food) return;
    setSaving(true);
    const { error } = await supabase.from("meals").insert({
      user_id: user.id,
      name: food.name,
      meal_type: mealType,
      calories: Math.round(food.calories),
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    sessionStorage.removeItem("nutriai:lastScan");
    toast.success("Saved to diary");
    navigate({ to: "/home" });
  }

  if (!food) return null;

  return (
    <div className="mx-auto max-w-md px-5 pt-10 pb-12">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/scanner" className="rounded-full bg-white/5 p-2">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">AI Result</h1>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-[#15151b] to-[#1a1015] p-6">
        <h2 className="text-xl font-bold">{food.name}</h2>
        <p className="mt-2 text-4xl font-extrabold text-[#ff6b35]">
          {Math.round(food.calories)} <span className="text-base font-normal text-white/50">kcal</span>
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { l: "Protein", v: food.protein, c: "#3b82f6" },
            { l: "Carbs", v: food.carbs, c: "#10b981" },
            { l: "Fat", v: food.fat, c: "#f59e0b" },
          ].map((m) => (
            <div key={m.l} className="rounded-2xl bg-black/30 p-3 text-center">
              <p className="text-xs text-white/50">{m.l}</p>
              <p className="mt-1 text-lg font-bold" style={{ color: m.c }}>
                {Math.round(m.v)}g
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-2 block text-sm text-white/60">Meal</label>
        <div className="grid grid-cols-4 gap-2">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setMealType(t)}
              className={`rounded-xl border px-2 py-2 text-xs capitalize transition ${
                mealType === t
                  ? "border-[#ff6b35] bg-[#ff6b35]/15 text-[#ff6b35]"
                  : "border-white/10 bg-[#15151b] text-white/70"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-8 w-full rounded-2xl bg-[#ff6b35] py-4 font-bold shadow-lg shadow-[#ff6b35]/30 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save To Diary"}
      </button>
    </div>
  );
}