import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const entries = Object.entries(body).filter(([k]) =>
    ["cycleStart"].includes(k)
  );
  for (const [key, value] of entries) {
    await prisma.setting.upsert({
      where: { key }, create: { key, value: String(value) }, update: { value: String(value) },
    });
  }
  return NextResponse.json({ ok: true });
}
