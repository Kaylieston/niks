import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendToAll } from "@/lib/push";
import { loadState } from "@/lib/state";
import { dateKey, dayIndex, weekOf } from "@/lib/dates";
import { TODAY_GROUPS } from "@/lib/defaults";

export const dynamic = "force-dynamic";

/**
 * Gọi mỗi 15 phút bởi Vercel Cron (xem vercel.json).
 * Chỉ gửi khi giờ hiện tại khớp giờ nhắc đã đặt, và chưa gửi trong ngày.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Sai secret" }, { status: 401 });
  }

  const state = await loadState();
  if (!state.settings.reminderEnabled) return NextResponse.json({ skipped: "reminder tắt" });

  // Giờ địa phương của người dùng — mặc định Asia/Ho_Chi_Minh
  const tz = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const [h, m] = state.settings.reminderTime.split(":").map(Number);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const target = h * 60 + m;
  if (Math.abs(minutesNow - target) > 7) return NextResponse.json({ skipped: "chưa tới giờ", minutesNow, target });

  const today = dateKey(now);
  const marker = await prisma.setting.findUnique({ where: { key: "lastReminderDate" } });
  if (marker?.value === today) return NextResponse.json({ skipped: "đã gửi hôm nay" });

  // Đếm số bước buổi tối còn chưa tick
  const week = weekOf(now, state.settings.cycleStart);
  const di = dayIndex(now);
  let remaining = 0;
  const evening = TODAY_GROUPS.find((g) => g.tone === "pm");
  for (const [scope, key] of evening?.parts ?? []) {
    const day = state.routines[scope][week][di];
    const sec = day?.sections.find((s: any) => s.key === key);
    for (const st of sec?.steps ?? []) {
      if (!state.checks[today]?.[`${scope}:${key}:${st.p}`]) remaining++;
    }
  }
  if (remaining === 0) return NextResponse.json({ skipped: "đã xong buổi tối" });

  const faceDay = state.routines.face[week][di];
  const res = await sendToAll({
    title: "Niks 🌸 — tới giờ chăm da",
    body: `${faceDay?.focus ?? "Routine tối nay"} · còn ${remaining} bước chưa xong.`,
    url: "/",
  });

  await prisma.setting.upsert({
    where: { key: "lastReminderDate" }, create: { key: "lastReminderDate", value: today }, update: { value: today },
  });
  return NextResponse.json({ ...res, remaining });
}
