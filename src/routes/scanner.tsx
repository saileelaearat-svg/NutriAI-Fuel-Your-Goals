import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/scanner")({
  component: Scanner,
});

function Scanner() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (!preview) {
      inputRef.current?.click();
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: preview }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Request failed (${res.status})`);
      }
      const food = await res.json();
      sessionStorage.setItem("nutriai:lastScan", JSON.stringify(food));
      navigate({ to: "/result" });
    } catch (e: any) {
      toast.error(e.message ?? "Could not analyze image");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-10 pb-12">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/home" className="rounded-full bg-white/5 p-2">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">AI Food Scanner</h1>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-white/15 bg-[#15151b]"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <div className="text-center">
            <Camera size={48} className="mx-auto mb-3 text-white/40" />
            <p className="text-sm text-white/60">Tap to take a photo or choose from gallery</p>
          </div>
        )}
      </button>

      <button
        disabled={analyzing}
        onClick={analyze}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff6b35] py-4 font-bold shadow-lg shadow-[#ff6b35]/30 disabled:opacity-60"
      >
        {analyzing ? (
          <>
            <Loader2 className="animate-spin" size={18} /> Analyzing with AI…
          </>
        ) : preview ? (
          "Analyze Food"
        ) : (
          "Choose Photo"
        )}
      </button>
      <p className="mt-3 text-center text-xs text-white/40">
        Powered by Lovable AI — Gemini vision
      </p>
    </div>
  );
}