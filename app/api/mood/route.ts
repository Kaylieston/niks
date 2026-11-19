import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MOOD_KEYS } from "@/lib/moods";

export async function PUT(req: NextRequest) {
  const { date, mood, note } = await req.json();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Thiếu ngày" }, { status: 400 });
  if (!MOOD_KEYS.includes(mood)) return NextResponse.json({ error: "Cảm xúc không hợp lệ" }, { status: 400 });
  const data = { mood, note: typeof note === "string" ? note : "" };
  const entry = await prisma.moodEntry.upsert({ where: { date }, create: { date, ...data }, update: data });
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Thiếu ngày" }, { status: 400 });
  await prisma.moodEntry.delete({ where: { date } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
