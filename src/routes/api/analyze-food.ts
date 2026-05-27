import { createFileRoute } from "@tanstack/react-router";
import { generateObject } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const BodySchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
});

const FoodSchema = z.object({
  name: z.string().describe("Short descriptive name of the dish, e.g. 'Avocado Toast'"),
  calories: z.number().describe("Estimated total kcal for the visible serving"),
  protein: z.number().describe("Protein in grams"),
  carbs: z.number().describe("Carbs in grams"),
  fat: z.number().describe("Fat in grams"),
});

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
          const { object } = await generateObject({
            model,
            schema: FoodSchema,
            messages: [
              {
                role: "system",
                content:
                  "You are a nutrition expert. Identify the food in the image and estimate macronutrients for a typical serving. Return concise values. If multiple items, give totals for what's visible.",
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Identify this food and estimate its nutrition." },
                  { type: "image", image: parsed.data.imageDataUrl },
                ],
              },
            ],
          });
          return Response.json(object);
        } catch (e: any) {
          const msg = e?.message ?? "AI request failed";
          const status = /429/.test(msg) ? 429 : /402/.test(msg) ? 402 : 500;
          return new Response(msg, { status });
        }
      },
    },
  },
});