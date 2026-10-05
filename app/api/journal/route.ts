import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const { date, acne, dark, dry, sting, note } = await req.json();
  if (!date) return NextResponse.json({ error: "Thiếu ngày" }, { status: 400 });
  const data = { acne: +acne || 1, dark: +dark || 1, dry: +dry || 1, sting: +sting || 1, note: note ?? "" };
  const entry = await prisma.journalEntry.upsert({ where: { date }, create: { date, ...data }, update: data });
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Thiếu ngày" }, { status: 400 });
  await prisma.journalEntry.delete({ where: { date } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
