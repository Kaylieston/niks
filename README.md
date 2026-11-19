# Niks 🌸

Routine chăm sóc da mặt, tóc và cơ thể theo chu kỳ 2 tuần — Next.js (App Router) + Prisma + PostgreSQL,
cài được lên màn hình chính iPhone và nhắc nhở buổi tối qua Web Push.

## Chạy thử ở máy

```bash
npm install
cp .env.example .env          # điền DATABASE_URL
npx prisma db push            # tạo bảng
npm run db:seed               # nạp tủ sản phẩm + lịch 2 tuần mặc định
npm run dev                   # http://localhost:3000
```

Service worker và "thêm vào màn hình chính" chỉ chạy trên `https` hoặc `localhost`.

## Deploy (Vercel + Neon)

1. Tạo database Postgres (Neon / Supabase / Vercel Postgres), copy connection string.
2. Push repo lên GitHub rồi import vào Vercel.
3. Trong Vercel → Settings → Environment Variables, điền các biến trong `.env.example`.
4. Tạo VAPID keys: `npx web-push generate-vapid-keys` → điền `NEXT_PUBLIC_VAPID_PUBLIC_KEY` và `VAPID_PRIVATE_KEY`.
5. Deploy xong, chạy một lần: `npx prisma db push && npm run db:seed` (dùng `DATABASE_URL` production).
6. Sửa `vercel.json`: thay `THAY-BANG-CRON_SECRET` bằng giá trị `CRON_SECRET` thật.

Lịch cron đang đặt `*/15 13-16 * * *` (giờ UTC) ≈ 20:00–23:45 giờ Việt Nam, 15 phút một lần.
Endpoint chỉ thực sự gửi khi khớp giờ nhắc đã đặt, chưa gửi trong ngày và buổi tối còn bước chưa tick.

## Cài lên iPhone

1. Mở site bằng **Safari** (Chrome trên iOS không cài được PWA).
2. Nút Share → **Thêm vào MH chính** → đặt tên Niks.
3. Mở Niks **từ icon ngoài màn hình chính** (bắt buộc), vào tab Hôm nay → "Bật thông báo".

iOS chỉ cho phép Web Push khi app đã nằm ở màn hình chính và được mở từ icon đó — mở trong Safari sẽ không bật được.
Cần iOS 16.4 trở lên.

## Chuyển dữ liệu từ bản HTML cũ

Bản HTML lưu trong `localStorage`. Mở file cũ → "Xuất file dự phòng" → được `routine-backup.json`.
Script `scripts/import-legacy.ts` nạp file đó vào database:

```bash
npx tsx scripts/import-legacy.ts ./routine-backup.json
```

## Cập nhật giao diện iPhone (11/2026)

- Thanh tab dưới: **Hôm nay · Lịch trình · Tủ đồ · Cảm xúc**, nút + để thêm nhanh.
- **Lịch trình**: xem minh hoạ từng bước theo thứ tự dùng, có hoạt ảnh và chồng "các lớp trên da"; nút ✎ để chỉnh lịch.
- **Tủ đồ**: quản lý mọi sản phẩm (tìm, lọc theo mục / trạng thái, ngày mở nắp + hạn dùng).
- **Cảm xúc**: ghi cảm xúc mỗi ngày, biểu đồ tròn theo tuần / tháng, lịch cảm xúc, kèm nhật ký da.
- Icon app mới (mèo ngủ trên trăng).

Bản này thêm bảng `MoodEntry` và hai cột `openedAt`, `paoMonths` cho `Product`. Trên Vercel, script `vercel-build`
tự chạy `prisma db push` trước khi build nên database được cập nhật khi deploy (chỉ thêm, không mất dữ liệu cũ;
nếu một thay đổi sau này có thể làm mất dữ liệu, build sẽ dừng lại thay vì tự xoá).

## Cấu trúc

- `prisma/schema.prisma` — Product, RoutineDay/Section/Step, Check, JournalEntry, MoodEntry, Setting, PushSubscription
- `app/api/*` — REST cho tủ sản phẩm, lịch, tick, nhật ký, cài đặt, push
- `components/NiksApp.tsx` — khung app, thanh tab, màn Hôm nay và cài đặt
- `components/RoutineView.tsx`, `ShelfView.tsx`, `MoodView.tsx` — các tab còn lại
- `components/art.tsx`, `lib/moods.ts` — hình minh hoạ sản phẩm và blob cảm xúc
- `public/sw.js` — cache vỏ app cho chế độ offline + nhận push
