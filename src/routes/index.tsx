import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      if (loading) return;
      navigate({ to: session ? "/home" : "/auth" });
    }, 1500);
    return () => clearTimeout(t);
  }, [session, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#1a0f08]">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#ff6b35] to-[#ff3b6b] text-5xl shadow-2xl shadow-[#ff6b35]/30">
        ✨
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight">NutriAI</h1>
      <p className="mt-2 text-sm text-white/60">Your AI nutrition companion</p>
    </div>
  );
}
