# Niks 🌸

Routine chăm sóc da mặt, tóc và cơ thể theo chu kỳ 2 tuần — Next.js (App Router) + Prisma + PostgreSQL,
cài được lên màn hình chính iPhone, có thống kê thói quen, nhật ký da và cảm xúc, giao diện Tiếng Việt / English.

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
3. Trong Vercel → Settings → Environment Variables, điền `DATABASE_URL`.
4. Deploy xong, chạy một lần: `npm run db:seed` (dùng `DATABASE_URL` production) nếu database còn trống.

## Cài lên iPhone

1. Mở site bằng **Safari** (Chrome trên iOS không cài được PWA).
2. Nút Share → **Thêm vào MH chính** → đặt tên Niks.
3. Mở Niks từ icon ngoài màn hình chính để có giao diện toàn màn hình.

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

## Cập nhật thói quen & ngôn ngữ (11/2026)

- Bỏ tính năng nhắc nhở / thông báo đẩy (cron, VAPID, `web-push`). Bảng `PushSubscription` vẫn giữ để không mất dữ liệu.
- Tab mới **Tiến độ** (nền picnic): điểm thói quen theo ngày / tháng / quý, theo từng mục, sản phẩm dùng nhiều nhất,
  tình trạng da và chuỗi ngày. Tab **Cảm xúc** có thêm tóm tắt thói quen và tình trạng da.
- **Lịch trình**: thẻ "Da hôm nay thế nào?" dưới các bước (bảng mới `SkinLog`), thay cho nhật ký da thang 1–5 cũ.
  Chỉnh lịch: kéo ⠿ để đổi thứ tự, vuốt trái để sửa / xoá, thêm bước bằng ô tìm kiếm + lọc theo loại.
- **Tủ đồ**: form thêm sản phẩm chọn trạng thái, mục và loại bằng nút; "Muốn mua" ẩn ngày mở nắp và hạn dùng.
- Cài đặt (bánh răng ở Hôm nay): chọn **Tiếng Việt / English** (lưu trên từng thiết bị) và chu kỳ 2 tuần.

## Cấu trúc

- `prisma/schema.prisma` — Product, RoutineDay/Section/Step, Check, SkinLog, MoodEntry, Setting (+ JournalEntry, PushSubscription cũ)
- `app/api/*` — REST cho tủ sản phẩm, lịch, tick, tình trạng da, cảm xúc, cài đặt
- `components/NiksApp.tsx` — khung app, thanh tab, màn Hôm nay và cài đặt
- `components/RoutineView.tsx`, `ProgressView.tsx`, `ShelfView.tsx`, `MoodView.tsx`, `Skin.tsx` — các tab còn lại
- `lib/i18n.tsx` — chuyển ngôn ngữ; `lib/habits.ts` — thống kê thói quen; `lib/skin.ts` — tình trạng da
- `components/art.tsx`, `lib/moods.ts` — hình minh hoạ sản phẩm và blob cảm xúc
- `public/sw.js` — cache vỏ app cho chế độ offline
- `public/bg/picnic.jpg` — nền tab Tiến độ
