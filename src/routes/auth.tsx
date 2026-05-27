import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/home" });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Account created — check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/home" },
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b35] to-[#ff3b6b] text-2xl">
          ✨
        </div>
        <h1 className="text-3xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          {mode === "signin" ? "Sign in to continue tracking" : "Start your nutrition journey"}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#15151b] px-4 py-4 text-white outline-none focus:border-[#ff6b35]"
          />
        )}
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[#15151b] px-4 py-4 text-white outline-none focus:border-[#ff6b35]"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[#15151b] px-4 py-4 text-white outline-none focus:border-[#ff6b35]"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-[#ff6b35] py-4 font-bold text-white shadow-lg shadow-[#ff6b35]/30 transition hover:bg-[#ff5722] disabled:opacity-50"
        >
          {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-white/40">
        <div className="h-px flex-1 bg-white/10" />
        OR
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        onClick={signInWithGoogle}
        className="w-full rounded-2xl border border-white/15 bg-white/5 py-4 font-semibold text-white transition hover:bg-white/10"
      >
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-6 text-center text-sm text-white/60 hover:text-white"
      >
        {mode === "signin"
          ? "No account? Create one"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}