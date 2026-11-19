import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SKIN_KEYS } from "@/lib/skin";

export async function PUT(req: NextRequest) {
  const { date, tags, note } = await req.json();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Thiếu ngày" }, { status: 400 });
  const clean = Array.isArray(tags) ? tags.map(String).filter((t) => SKIN_KEYS.includes(t)) : [];
  const data = { tags: clean.join(","), note: typeof note === "string" ? note.slice(0, 500) : "" };
  const entry = await prisma.skinLog.upsert({ where: { date }, create: { date, ...data }, update: data });
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Thiếu ngày" }, { status: 400 });
  await prisma.skinLog.delete({ where: { date } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
