import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_FINANCE_CONFIG } from "@/lib/finance-utils";

// GET — fetch the current user's allocation config (or defaults if none saved yet)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cfg = await prisma.financeConfig.findUnique({
    where: { userId: session.user.id },
  });

  if (!cfg) {
    return NextResponse.json({ config: DEFAULT_FINANCE_CONFIG });
  }

  return NextResponse.json({
    config: {
      lockedLabel: cfg.lockedLabel,
      fundLabel: cfg.fundLabel,
      skillLabel: cfg.skillLabel,
      flexLabel: cfg.flexLabel,
      lockedDesc: cfg.lockedDesc,
      fundDesc: cfg.fundDesc,
      skillDesc: cfg.skillDesc,
      flexDesc: cfg.flexDesc,
      lockedPct: cfg.lockedPct,
      fundPct: cfg.fundPct,
      skillPct: cfg.skillPct,
      flexPct: cfg.flexPct,
    },
  });
}

const PUT_SCHEMA = z.object({
  lockedLabel: z.string().trim().min(1).max(30),
  fundLabel: z.string().trim().min(1).max(30),
  skillLabel: z.string().trim().min(1).max(30),
  flexLabel: z.string().trim().min(1).max(30),
  lockedDesc: z.string().trim().max(80),
  fundDesc: z.string().trim().max(80),
  skillDesc: z.string().trim().max(80),
  flexDesc: z.string().trim().max(80),
  lockedPct: z.number().min(0).max(100),
  fundPct: z.number().min(0).max(100),
  skillPct: z.number().min(0).max(100),
  flexPct: z.number().min(0).max(100),
});

// PUT — replace the current user's allocation config
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = PUT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const total = data.lockedPct + data.fundPct + data.skillPct + data.flexPct;
  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json(
      { error: `Percentages must sum to 100 (got ${total.toFixed(2)}).` },
      { status: 400 },
    );
  }

  const saved = await prisma.financeConfig.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  return NextResponse.json({
    config: {
      lockedLabel: saved.lockedLabel,
      fundLabel: saved.fundLabel,
      skillLabel: saved.skillLabel,
      flexLabel: saved.flexLabel,
      lockedDesc: saved.lockedDesc,
      fundDesc: saved.fundDesc,
      skillDesc: saved.skillDesc,
      flexDesc: saved.flexDesc,
      lockedPct: saved.lockedPct,
      fundPct: saved.fundPct,
      skillPct: saved.skillPct,
      flexPct: saved.flexPct,
    },
  });
}
