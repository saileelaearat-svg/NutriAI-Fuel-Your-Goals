import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Profile as ProfileT } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

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
  const [name, setName] = useState<string>("");
  const [calGoal, setCalGoal] = useState<number>(2100);
  const [weight, setWeight] = useState<string>("");
  const [target, setTarget] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (p) {
      setName(p.name ?? "");
      setCalGoal(p.daily_calories ?? 2100);
      setWeight(p.current_weight != null ? String(p.current_weight) : "");
      setTarget(p.target_weight != null ? String(p.target_weight) : "");
    }
  }, [p]);

  async function save() {
    // Always re-fetch the authenticated user — never trust stale state for writes.
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      toast.error("You must be signed in to save your profile.");
      navigate({ to: "/auth" });
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: auth.user.id,
          name: name || null,
          daily_calories: calGoal,
          current_weight: weight ? Number(weight) : null,
          target_weight: target ? Number(target) : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    if (error) {
      toast.error(error.message ?? "Could not save");
    } else {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["profile", auth.user.id] });
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-10 pb-24">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      <div className="rounded-3xl bg-gradient-to-br from-[#15151b] to-[#1a1015] p-6 text-center shadow-xl shadow-black/40">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ff3b6b] text-3xl font-bold shadow-lg shadow-[#ff6b35]/40">
          {(p?.name ?? user?.email ?? "U")[0].toUpperCase()}
        </div>
        <h2 className="mt-3 text-lg font-bold">{p?.name ?? "Unnamed"}</h2>
        <p className="text-sm text-white/50">{user?.email}</p>
      </div>

      <section className="mt-5 space-y-3 rounded-3xl bg-[#15151b] p-4">
        <h3 className="text-sm font-semibold text-white/70">Goals</h3>

        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-40 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-right text-sm outline-none focus:border-[#ff6b35]"
          />
        </Field>
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
          disabled={saving}
          className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#ff6b35] to-[#ff3b6b] py-3 font-semibold shadow-lg shadow-[#ff6b35]/30 transition active:scale-[0.98]"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </section>

      <div className="mt-6 flex flex-col items-center text-center text-xs text-white/30">
        <img src={logo} alt="NutriAI" width={48} height={48} className="opacity-70" loading="lazy" />
        <p className="mt-2">NutriAI · v1.0</p>
      </div>

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