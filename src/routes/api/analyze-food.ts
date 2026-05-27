import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const BodySchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
});

const FoodSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in response");
  return JSON.parse(candidate.slice(start, end + 1));
}

export const Route = createFileRoute("/api/analyze-food")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return new Response("Invalid body", { status: 400 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-2.5-flash");

        try {
          const { text } = await generateText({
            model,
            system:
              "You are a nutrition expert. Identify the food in the image and estimate macronutrients for a typical visible serving. Reply ONLY with a single JSON object matching this exact shape: {\"name\": string, \"calories\": number, \"protein\": number, \"carbs\": number, \"fat\": number}. No prose, no code fences.",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "Identify this food and estimate its nutrition." },
                  { type: "image", image: parsed.data.imageDataUrl },
                ],
              },
            ],
          });
          const food = FoodSchema.parse(extractJson(text));
          return Response.json(food);
        } catch (e: any) {
          const msg = e?.message ?? "AI request failed";
          const status = /429/.test(msg) ? 429 : /402/.test(msg) ? 402 : 500;
          return new Response(msg, { status });
        }
      },
    },
  },
});