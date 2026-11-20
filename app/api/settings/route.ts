import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (typeof body.skinProfile === "object" && body.skinProfile) body.skinProfile = JSON.stringify(body.skinProfile);
  const entries = Object.entries(body).filter(([k]) =>
    ["cycleStart", "skinProfile"].includes(k)
  );
  for (const [key, value] of entries) {
    await prisma.setting.upsert({
      where: { key }, create: { key, value: String(value) }, update: { value: String(value) },
    });
  }
  return NextResponse.json({ ok: true });
}
