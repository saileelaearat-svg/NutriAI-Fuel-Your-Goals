import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a0a0f] via-[#13080a] to-[#1a0f08]">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#ff6b35]/20 blur-3xl" />
      <div className="relative mb-6 h-32 w-32 animate-pulse">
        <div className="absolute inset-0 rounded-3xl bg-[#ff6b35]/30 blur-2xl" />
        <img src={logo} alt="NutriAI logo" className="relative h-full w-full drop-shadow-[0_8px_24px_rgba(255,107,53,0.5)]" />
      </div>
      <h1 className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
        NutriAI
      </h1>
      <p className="mt-2 text-sm text-white/60">Your AI nutrition companion</p>
    </div>
  );
}
