import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { subscription, label } = await req.json();
  if (!subscription?.endpoint) return NextResponse.json({ error: "Thiếu subscription" }, { status: 400 });
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      label: label ?? "",
    },
    update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (endpoint) await prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
