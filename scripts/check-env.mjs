// Chạy đầu tiên khi build trên Vercel: báo rõ biến môi trường nào còn thiếu thay vì lỗi khó hiểu của Prisma.
const required = ["DATABASE_URL"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`✖ Thiếu biến môi trường bắt buộc: ${missing.join(", ")}. Thêm trong Vercel → Settings → Environment Variables rồi deploy lại.`);
  process.exit(1);
}
console.log("✓ Biến môi trường đã đủ để build.");
