// Chạy đầu tiên khi build trên Vercel: báo rõ biến môi trường nào còn thiếu thay vì lỗi khó hiểu của Prisma.
const required = ["DATABASE_URL"];
const recommended = ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "CRON_SECRET"];
const missing = required.filter((k) => !process.env[k]);
const soft = recommended.filter((k) => !process.env[k]);
if (soft.length) console.warn(`⚠ Thiếu biến (thông báo đẩy / cron sẽ không chạy): ${soft.join(", ")}`);
if (missing.length) {
  console.error(`✖ Thiếu biến môi trường bắt buộc: ${missing.join(", ")}. Thêm trong Vercel → Settings → Environment Variables rồi deploy lại.`);
  process.exit(1);
}
console.log("✓ Biến môi trường đã đủ để build.");
