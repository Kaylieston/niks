import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: any = {};
  for (const k of ["scope", "group", "name", "note", "status", "openedAt"]) if (k in body) data[k] = body[k];
  if ("paoMonths" in body) data.paoMonths = +body.paoMonths || 0;
  const product = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Step và Check có onDelete: Cascade nên các bước trong lịch tự được gỡ theo
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
