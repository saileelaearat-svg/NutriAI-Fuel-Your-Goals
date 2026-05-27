import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Profile as ProfileT } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const q = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ProfileT | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileT | null;
    },
  });

  const p = q.data;
  const [calGoal, setCalGoal] = useState<number>(2100);
  const [weight, setWeight] = useState<string>("");
  const [target, setTarget] = useState<string>("");

  useEffect(() => {
    if (p) {
      setCalGoal(p.daily_calorie_goal ?? 2100);
      setWeight(p.weight_kg != null ? String(p.weight_kg) : "");
      setTarget(p.target_weight_kg != null ? String(p.target_weight_kg) : "");
    }
  }, [p]);

  async function save() {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        daily_calorie_goal: calGoal,
        weight_kg: weight ? Number(weight) : null,
        target_weight_kg: target ? Number(target) : null,
      });
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      q.refetch();
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-10 pb-24">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      <div className="rounded-3xl bg-gradient-to-br from-[#15151b] to-[#1a1015] p-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ff3b6b] text-3xl font-bold">
          {(p?.full_name ?? user?.email ?? "U")[0].toUpperCase()}
        </div>
        <h2 className="mt-3 text-lg font-bold">{p?.full_name ?? "Unnamed"}</h2>
        <p className="text-sm text-white/50">{user?.email}</p>
      </div>

      <section className="mt-5 space-y-3 rounded-3xl bg-[#15151b] p-4">
        <h3 className="text-sm font-semibold text-white/70">Goals</h3>

        <Field label="Daily calories (kcal)">
          <input
            type="number"
            value={calGoal}
            onChange={(e) => setCalGoal(Number(e.target.value))}
            className="w-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-right text-sm outline-none focus:border-[#ff6b35]"
          />
        </Field>
        <Field label="Current weight (kg)">
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="—"
            className="w-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-right text-sm outline-none focus:border-[#ff6b35]"
          />
        </Field>
        <Field label="Target weight (kg)">
          <input
            type="number"
            step="0.1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="—"
            className="w-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-right text-sm outline-none focus:border-[#ff6b35]"
          />
        </Field>

        <button
          onClick={save}
          className="mt-2 w-full rounded-2xl bg-[#ff6b35] py-3 font-semibold"
        >
          Save changes
        </button>
      </section>

      <button
        onClick={async () => {
          await signOut();
          navigate({ to: "/auth" });
        }}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-3 font-semibold text-red-400"
      >
        <LogOut size={16} />
        Sign out
      </button>

      <BottomNav />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/70">{label}</span>
      {children}
    </div>
  );
}