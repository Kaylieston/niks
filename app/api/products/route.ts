import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.name || !body?.scope || !body?.group) {
    return NextResponse.json({ error: "Thiếu name, scope hoặc group" }, { status: 400 });
  }
  const count = await prisma.product.count({ where: { scope: body.scope } });
  const product = await prisma.product.create({
    data: {
      scope: body.scope, group: body.group, name: body.name,
      note: body.note ?? "", status: body.status ?? "active", order: count,
      openedAt: body.openedAt ?? "", paoMonths: +body.paoMonths || 0,
    },
  });
  return NextResponse.json(product, { status: 201 });
}
