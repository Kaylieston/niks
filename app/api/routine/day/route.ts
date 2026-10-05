import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const { scope, week, dayIndex, focus } = await req.json();
  await prisma.routineDay.update({
    where: { scope_week_dayIndex: { scope, week, dayIndex } },
    data: { focus },
  });
  return NextResponse.json({ ok: true });
}
