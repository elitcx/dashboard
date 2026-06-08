import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { requireUser } from "@/lib/auth-utils";
import { parseGeminiText } from "@/lib/gym-parser";

const schema = z.object({
  text: z.string().min(1).max(20_000),
});

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING },
    date: { type: SchemaType.STRING },
    dayType: { type: SchemaType.STRING },
    notes: { type: SchemaType.STRING },
    exercises: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          sets: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                reps: { type: SchemaType.NUMBER },
                weight: { type: SchemaType.NUMBER },
                duration: { type: SchemaType.NUMBER },
                notes: { type: SchemaType.STRING },
              },
            },
          },
        },
        required: ["name", "sets"],
      },
    },
  },
  required: ["name", "date", "dayType", "exercises"],
};

const today = () => new Date().toISOString().slice(0, 10);

const SYSTEM_PROMPT = `You are a workout log parser. Extract structured data from raw workout notes.

Rules:
- date: ISO format YYYY-MM-DD. If not mentioned, use today: ${today()}
- dayType: infer from exercises — bench/chest/triceps/shoulders/overhead = PUSH; rows/pullups/biceps/back = PULL; squats/legs/hamstrings/glutes = LOWER; push+pull mix = UPPER; push+pull+lower = FULL_BODY; only cardio = CARDIO; otherwise OTHER
- All weights in kg. If user writes lbs, convert (multiply by 0.453592, round to 1 decimal).
- Bodyweight exercises (pull-ups, push-ups, dips, etc.): set weight to null.
- For cardio (walking, running, cycling, etc.): set duration in minutes, reps and weight to null.
- notes: general session feeling/notes, or null if none.
- If a set line is ambiguous (e.g. "3x10"), expand it into 3 separate set objects each with reps=10.
- name: short descriptive name like "Push Day", "Pull Day", or "Gym Log" if unclear.`;

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { text } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash-lite",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
          },
          systemInstruction: SYSTEM_PROMPT,
        });

        const result = await model.generateContent(text);
        const workoutData = JSON.parse(result.response.text());

        if (Array.isArray(workoutData.exercises) && workoutData.exercises.length > 0) {
          // Normalise nulls — Gemini may omit optional fields instead of null-ing them
          workoutData.exercises = workoutData.exercises.map(
            (ex: { name: string; sets: Record<string, unknown>[] }) => ({
              ...ex,
              sets: ex.sets.map((s) => ({
                reps: s.reps ?? null,
                weight: s.weight ?? null,
                duration: s.duration ?? null,
                notes: s.notes ?? null,
              })),
            }),
          );
          return NextResponse.json({ parsed: workoutData });
        }
      } catch (geminiErr) {
        console.error("Gemini parse failed, falling back to regex:", geminiErr);
      }
    }

    // Fallback: regex-based parser
    const result = parseGeminiText(text);
    return NextResponse.json({ parsed: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    console.error("POST /api/gym/import:", err);
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
