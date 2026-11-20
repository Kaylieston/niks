# Niks 🌸

Routine chăm sóc da mặt, tóc và cơ thể theo chu kỳ 2 tuần — Next.js (App Router) + Prisma + PostgreSQL,
cài được lên màn hình chính iPhone, có thống kê thói quen, nhật ký da và cảm xúc, giao diện Tiếng Việt / English.

**Bản đang chạy:** https://niks-eight.vercel.app

## Tính năng

Năm tab ở thanh dưới: **Hôm nay · Lịch trình · Tiến độ · Tủ đồ · Cảm xúc**.

### Giao diện iPhone
- Thiết kế riêng cho iPhone, icon app mới (mèo ngủ trên trăng), lời chào "Hi Kaylie".
- Bảng màu: Vanilla Cream `#FFF7E6` (nền), Blush Petal, Rosewood, Sage Leaf, Misty Sky, Midnight Lagoon.
- Thanh trạng thái iPhone cùng màu kem với nền.
- Thanh tab kiểu "liquid glass": gọn hơn, tự ẩn khi cuộn xuống và hiện lại khi cuộn lên hoặc tới cuối trang.

### Hôm nay
- Routine sáng hoặc tối theo giờ hiện tại (số bước, đã xong bao nhiêu), nút **Bắt đầu / Làm tiếp** mở thẳng tab Lịch trình.
- Check-in cảm xúc nhanh, chuỗi ngày (≥ 80% số bước), sản phẩm sắp hết hạn hoặc danh sách muốn mua.
- Cài đặt (bánh răng): **Tiếng Việt / English** (lưu trên từng thiết bị) và chu kỳ 2 tuần.

### Lịch trình
- Routine từng bước theo thứ tự dùng, có hoạt ảnh và minh hoạ "các lớp trên da" chồng lên dần.
- Thẻ **"Da hôm nay thế nào?"** dưới các bước để check-in tình trạng da (bảng `SkinLog`).
- Chỉnh lịch (nút ✎): kéo ⠿ để đổi thứ tự, vuốt trái để sửa / xoá, thêm bước bằng ô tìm kiếm + lọc theo loại.

### Tiến độ (nền picnic)
- Điểm thói quen theo **ngày / tháng / quý**, theo từng mục (mặt, tóc, cơ thể).
- Sản phẩm dùng nhiều nhất, tình trạng da theo thời gian và chuỗi ngày liên tiếp.

### Tủ đồ
- Quản lý mọi sản phẩm: tìm kiếm, lọc theo mục và trạng thái (**Đang dùng · Tạm ngưng · Hết · Muốn mua**).
- Ngày mở nắp + hạn dùng sau khi mở (PAO); danh sách "Muốn mua" ẩn hai ô này.
- Form thêm sản phẩm chọn trạng thái, mục và loại bằng nút.

### Cảm xúc
- Ghi cảm xúc mỗi ngày, **biểu đồ tròn** theo 7 ngày / tháng này / từ trước tới nay.
- Lịch cảm xúc theo tháng, kèm tóm tắt thói quen và tình trạng da.

### Tự cập nhật & offline
- Mỗi lần mở app (kể cả khi iPhone mở lại app từ nền) đều kiểm tra bản mới; có bản mới thì tự tải lại một lần,
  không còn kẹt ở bản cũ.
- Service worker lưu vỏ app để vẫn mở được khi mất mạng.

> Tính năng nhắc nhở / thông báo đẩy đã được bỏ (bảng `PushSubscription` vẫn giữ để không mất dữ liệu).

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

## Cập nhật database

Trên Vercel, script `vercel-build` tự chạy `prisma db push` trước khi build nên các thay đổi schema được áp dụng khi deploy
(chỉ thêm, không mất dữ liệu cũ; nếu một thay đổi có thể làm mất dữ liệu, build sẽ dừng lại thay vì tự xoá).

## Cấu trúc

- `prisma/schema.prisma` — Product, RoutineDay/Section/Step, Check, SkinLog, MoodEntry, Setting (+ JournalEntry, PushSubscription cũ)
- `app/api/*` — REST cho tủ sản phẩm, lịch, tick, tình trạng da, cảm xúc, cài đặt
- `components/NiksApp.tsx` — khung app, thanh tab, màn Hôm nay và cài đặt
- `components/RoutineView.tsx`, `ProgressView.tsx`, `ShelfView.tsx`, `MoodView.tsx`, `Skin.tsx` — các tab còn lại
- `lib/i18n.tsx` — chuyển ngôn ngữ; `lib/habits.ts` — thống kê thói quen; `lib/skin.ts` — tình trạng da
- `components/art.tsx`, `lib/moods.ts` — hình minh hoạ sản phẩm và blob cảm xúc
- `public/sw.js` — cache vỏ app cho chế độ offline
- `public/bg/picnic.jpg` — nền tab Tiến độ
