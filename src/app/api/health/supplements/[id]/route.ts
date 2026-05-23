import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schedule = await prisma.supplementSchedule.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.supplementSchedule.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
