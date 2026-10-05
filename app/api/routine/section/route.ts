import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Ghi đè toàn bộ các bước của một buổi — dùng cho thêm, bỏ, kéo thả và sửa ghi chú. */
export async function PUT(req: NextRequest) {
  const { scope, week, dayIndex, key, steps } = await req.json();
  const day = await prisma.routineDay.findUnique({
    where: { scope_week_dayIndex: { scope, week, dayIndex } },
    include: { sections: true },
  });
  if (!day) return NextResponse.json({ error: "Không tìm thấy ngày" }, { status: 404 });

  let section = day.sections.find((s) => s.key === key);
  if (!section) {
    section = await prisma.section.create({ data: { dayId: day.id, key, order: day.sections.length } });
  }

  await prisma.$transaction([
    prisma.step.deleteMany({ where: { sectionId: section.id } }),
    prisma.step.createMany({
      data: (steps ?? []).map((st: any, i: number) => ({
        sectionId: section!.id, productId: st.p, note: st.n ?? "", order: i,
      })),
    }),
  ]);
  return NextResponse.json({ ok: true });
}
