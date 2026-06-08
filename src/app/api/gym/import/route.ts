import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireUser } from "@/lib/auth-utils";
import { parseGeminiText } from "@/lib/gym-parser";

const schema = z.object({
  text: z.string().min(1).max(20_000),
  exerciseNames: z.array(z.string()).optional(),
});

function buildPrompt(exerciseNames?: string[]): string {
  const today = new Date().toISOString().slice(0, 10);

  const knownExercises =
    exerciseNames && exerciseNames.length > 0
      ? `\n\nKnown exercises from this user's history (use the EXACT name from this list when you recognise an exercise — same capitalisation, spelling, and spacing):\n${exerciseNames.map((n) => `- ${n}`).join("\n")}`
      : "";

  return `You are a workout log parser. Extract structured workout data from raw notes and return JSON only.

Output format — return ONLY this JSON structure, no markdown, no explanation:
{
  "name": "Push Day",
  "date": "YYYY-MM-DD",
  "dayType": "PUSH",
  "notes": "felt strong" or null,
  "exercises": [
    {
      "name": "Bench Press",
      "sets": [
        { "reps": 8, "weight": 80.0, "duration": null, "notes": null }
      ]
    }
  ]
}

Rules:
1. Every set MUST have all four fields: reps, weight, duration, notes. Use null for fields that don't apply — never omit a field.
2. Expand shorthand into individual set objects:
   - "10,10,8,6" → 4 separate sets with those reps
   - "4x8" or "4 x 8" → 4 sets each with 8 reps
   - "3 sets of 10" → 3 sets with 10 reps
3. Bodyweight exercises (pull-ups, ring dips, push-ups, dips, ring rows, etc.): weight = null.
4. Cardio (walking, running, cycling, etc.): reps = null, weight = null, duration = minutes as a number.
5. All weights in kg. Convert lbs → kg (× 0.453592, round to 1 decimal).
6. dayType: infer from exercises — PUSH (chest/shoulders/triceps), PULL (back/biceps/rows/pull-ups), LOWER (legs/squats/hamstrings), UPPER (push + pull), FULL_BODY (push + pull + lower), CARDIO (only cardio), OTHER.
7. date: ISO YYYY-MM-DD. Today is ${today} if not specified.
8. name: short descriptive name, e.g. "Push Day", "Upper Day", "Gym Log".
9. notes: general session feeling/comment, or null.
10. Exercise naming — apply in order:
    a) Check the known exercises list using FUZZY matching (abbreviations, partial words, typos all count): "db lat raise" matches "DB Lateral Raise", "pull up" matches "Pull-Ups", "shoulder press" matches "DB Shoulder Press" if that's the only shoulder press in the list. If a fuzzy match is found, use that EXACT known name.
    b) If no match, expand common abbreviations and format in Title Case: "lat" → "Lateral", "db" → "DB", "bb" → "BB", "rdl" → "RDL", "ohp" → "OHP". Keep abbreviations like DB/BB/RDL fully uppercase. Example: "db lat raise" → "DB Lateral Raise", "ring dips" → "Ring Dips".
    c) Do NOT rename or substitute a "canonical" gym name beyond what's described above.${knownExercises}`;
}

const ABBREV: Record<string, string> = {
  db: "dumbbell",
  bb: "barbell",
  lat: "lateral",
  inc: "incline",
  dec: "decline",
  rdl: "rdl",
  ohp: "ohp",
  bw: "bodyweight",
};

function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[-_/]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ABBREV[w] ?? w);
}

function fuzzyMatchExercise(input: string, knownNames: string[]): string | null {
  if (!knownNames.length) return null;
  const inputTokens = tokenize(input);
  let bestName: string | null = null;
  let bestScore = 0;
  for (const known of knownNames) {
    const knownTokens = tokenize(known);
    let hits = 0;
    for (const it of inputTokens) {
      if (knownTokens.some((kt) => kt === it || kt.startsWith(it) || it.startsWith(kt))) hits++;
    }
    const score = hits / Math.max(inputTokens.length, knownTokens.length);
    if (score > bestScore) {
      bestScore = score;
      bestName = known;
    }
  }
  return bestScore >= 0.6 ? bestName : null;
}

const KEEP_UPPER = new Set(["db", "bb", "rdl", "ohp", "hspu", "bw"]);

function titleCase(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => (KEEP_UPPER.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

function normaliseExercises(
  exercises: Array<{ name: string; sets: Array<Record<string, unknown>> }>,
  knownNames: string[],
) {
  return exercises.map((ex) => {
    const matched = fuzzyMatchExercise(ex.name, knownNames);
    const name = matched ?? titleCase(ex.name);
    return {
      name,
      sets: ex.sets.map((s) => ({
        reps: typeof s.reps === "number" ? s.reps : null,
        weight: typeof s.weight === "number" ? s.weight : null,
        duration: typeof s.duration === "number" ? s.duration : null,
        notes: typeof s.notes === "string" ? s.notes : null,
      })),
    };
  });
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { text, exerciseNames } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-3.1-flash-lite",
          generationConfig: { responseMimeType: "application/json" },
          systemInstruction: buildPrompt(exerciseNames),
        });

        const result = await model.generateContent(text);
        const workoutData = JSON.parse(result.response.text());

        if (Array.isArray(workoutData.exercises) && workoutData.exercises.length > 0) {
          workoutData.exercises = normaliseExercises(workoutData.exercises, exerciseNames ?? []);
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
