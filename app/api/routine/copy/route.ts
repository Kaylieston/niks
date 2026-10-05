import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Chép toàn bộ lịch của một tuần sang tuần còn lại trong cùng scope. */
export async function POST(req: NextRequest) {
  const { scope, from, to } = await req.json();
  const source = await prisma.routineDay.findMany({
    where: { scope, week: from },
    include: { sections: { include: { steps: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
  });

  for (const day of source) {
    const target = await prisma.routineDay.findUnique({
      where: { scope_week_dayIndex: { scope, week: to, dayIndex: day.dayIndex } },
      include: { sections: true },
    });
    if (!target) continue;
    await prisma.routineDay.update({ where: { id: target.id }, data: { focus: day.focus } });
    await prisma.section.deleteMany({ where: { dayId: target.id } });
    for (const [si, sec] of day.sections.entries()) {
      await prisma.section.create({
        data: {
          dayId: target.id, key: sec.key, order: si,
          steps: { create: sec.steps.map((st, i) => ({ productId: st.productId, note: st.note, order: i })) },
        },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
