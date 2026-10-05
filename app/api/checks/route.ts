import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { date, scope, sectionKey, productId, done } = await req.json();
  if (done) {
    await prisma.check.upsert({
      where: { date_scope_sectionKey_productId: { date, scope, sectionKey, productId } },
      create: { date, scope, sectionKey, productId },
      update: {},
    });
  } else {
    await prisma.check
      .delete({ where: { date_scope_sectionKey_productId: { date, scope, sectionKey, productId } } })
      .catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
