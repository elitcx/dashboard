import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-utils";
import { parseGeminiText } from "@/lib/gym-parser";

const schema = z.object({
  text: z.string().min(1).max(20_000),
});

// Pure parse endpoint — preview only. The client confirms by calling
// POST /api/gym/workouts with the (possibly edited) parsed data.
export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const result = parseGeminiText(parsed.data.text);
    return NextResponse.json({ parsed: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
