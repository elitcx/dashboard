import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).max(60),
  balanceTarget: z.enum(["FUND", "SKILL", "FLEX"]),
  description: z.string().max(200).optional(),
  date: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { amount, category, balanceTarget, description, date: dateStr } = parsed.data;
  const date = dateStr ? new Date(dateStr) : new Date();

  const expense = await prisma.expense.create({
    data: {
      userId: session.user.id,
      amount,
      category,
      balanceTarget,
      description: description ?? null,
      date,
    },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
