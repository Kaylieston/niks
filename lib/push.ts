import webpush from "web-push";
import { prisma } from "./prisma";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("Chưa cấu hình VAPID keys trong .env");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:niks@example.com", pub, priv);
  configured = true;
}

export async function sendToAll(payload: { title: string; body: string; url?: string }) {
  configure();
  const subs = await prisma.pushSubscription.findMany();
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      )
    )
  );
  // Dọn các subscription đã hết hạn (410 Gone / 404)
  for (const [i, r] of results.entries()) {
    if (r.status === "rejected" && [404, 410].includes((r.reason as any)?.statusCode)) {
      await prisma.pushSubscription.delete({ where: { endpoint: subs[i].endpoint } }).catch(() => null);
    }
  }
  return { sent: results.filter((r) => r.status === "fulfilled").length, total: subs.length };
}
