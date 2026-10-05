export type Scope = "face" | "hair" | "body";
export type ProductStatus = "active" | "paused" | "empty" | "wish";

export const GROUPS: Record<Scope, string[]> = {
  face: ["Tẩy trang", "Sữa rửa mặt", "Tẩy da chết", "Toner", "Active (acid / retinoid)", "Serum", "Kem dưỡng / Gel", "Mặt nạ", "Chống nắng"],
  hair: ["Tẩy da chết da đầu", "Dầu gội", "Dầu xả", "Ủ tóc", "Serum", "Dầu dưỡng"],
  body: ["Tẩy da chết", "Dầu dưỡng", "Kem dưỡng"],
};

export const GROUP_ICON: Record<string, string> = {
  "Tẩy trang": "micellar", "Sữa rửa mặt": "cleanser", "Tẩy da chết": "exfoliant", "Toner": "toner",
  "Active (acid / retinoid)": "balm", "Serum": "serum", "Kem dưỡng / Gel": "cream", "Mặt nạ": "mask", "Chống nắng": "sun",
  "Tẩy da chết da đầu": "exfoliant", "Dầu gội": "water", "Dầu xả": "toner", "Ủ tóc": "cream", "Dầu dưỡng": "serum", "Kem dưỡng": "cream",
};

export const STATUS: Record<ProductStatus, string> = {
  active: "Đang dùng", paused: "Tạm ngưng", empty: "Hết", wish: "Muốn mua",
};
export const STATUS_KEYS: ProductStatus[] = ["active", "paused", "empty", "wish"];
export const WEEK_LABEL: Record<string, string> = { A: "Tuần 1 & 3", B: "Tuần 2 & 4" };
export const DAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
export const SCOPE_LABEL: Record<Scope, string> = { face: "Da mặt", hair: "Tóc", body: "Cơ thể" };

export const SECTION_META: Record<Scope, Record<string, { title: string; sub: string; tone: "am" | "pm" }>> = {
  face: { am: { title: "Buổi sáng", sub: "Chăm da ban ngày", tone: "am" }, pm: { title: "Buổi tối", sub: "Chăm da ban đêm", tone: "pm" } },
  hair: { day: { title: "Chăm tóc hôm nay", sub: "Các bước trong ngày", tone: "am" } },
  body: { am: { title: "Sau khi tắm", sub: "Chăm thể ban ngày", tone: "am" }, pm: { title: "Trước khi ngủ", sub: "Chăm thể ban đêm", tone: "pm" } },
};

export const TODAY_GROUPS: { title: string; sub: string; tone: "am" | "pm"; parts: [Scope, string][] }[] = [
  { title: "Buổi sáng", sub: "Trước khi ra khỏi nhà", tone: "am", parts: [["face", "am"], ["body", "am"]] },
  { title: "Buổi tối", sub: "Trước khi ngủ", tone: "pm", parts: [["face", "pm"], ["body", "pm"]] },
  { title: "Tóc hôm nay", sub: "Gội & dưỡng da đầu", tone: "am", parts: [["hair", "day"]] },
];

export type SeedProduct = { key: string; scope: Scope; group: string; name: string; note?: string };

export const SEED_PRODUCTS: SeedProduct[] = [
  { key: "f01", scope: "face", group: "Tẩy trang", name: "Tẩy trang Bioderma" },
  { key: "f02", scope: "face", group: "Sữa rửa mặt", name: "Sữa rửa mặt Dermacos" },
  { key: "f22", scope: "face", group: "Sữa rửa mặt", name: "Rửa mặt nhẹ bằng nước ấm", note: "Buổi sáng, nếu da không đổ dầu nhiều qua đêm" },
  { key: "f03", scope: "face", group: "Tẩy da chết", name: "Tẩy da chết Civasan 30g", note: "Dạng foam — gần như không ma sát, 1 lần/tuần" },
  { key: "f04", scope: "face", group: "Toner", name: "Toner Cocoon Sen" },
  { key: "f05", scope: "face", group: "Toner", name: "Toner keo ong CNP", note: "Làm dịu, phục hồi, hỗ trợ mờ thâm" },
  { key: "f06", scope: "face", group: "Active (acid / retinoid)", name: "Toner BHA Dermarium Tricky Duet 2%", note: "Tuần 1 & 3" },
  { key: "f07", scope: "face", group: "Active (acid / retinoid)", name: "Toner AHA Dermarium Rough Addition 8%", note: "Tuần 2 & 4" },
  { key: "f08", scope: "face", group: "Active (acid / retinoid)", name: "Adapalene Differin 0.1%", note: "2 tối/tuần" },
  { key: "f09", scope: "face", group: "Active (acid / retinoid)", name: "Azelaic acid 15% — Azecont", note: "Đêm trị thâm" },
  { key: "f10", scope: "face", group: "Serum", name: "Serum Niacinamide 15% — Cocoon", note: "Buổi sáng" },
  { key: "f11", scope: "face", group: "Serum", name: "Serum Vitamin C — Cocoon Nghệ C22", note: "Buổi sáng" },
  { key: "f12", scope: "face", group: "Serum", name: "Serum Centella Skin1004" },
  { key: "f13", scope: "face", group: "Serum", name: "Cetaphil Cica Restoring Serum", note: "Phục hồi sau active" },
  { key: "f14", scope: "face", group: "Serum", name: "Serum Estee Lauder Advanced Night Repair", note: "Đêm dùng Azelaic" },
  { key: "f15", scope: "face", group: "Kem dưỡng / Gel", name: "Winter Melon Gel Cream", note: "Nhẹ, kiềm dầu" },
  { key: "f16", scope: "face", group: "Kem dưỡng / Gel", name: "Kem dưỡng Estee Lauder Revitalizing Supreme", note: "Ban ngày" },
  { key: "f17", scope: "face", group: "Kem dưỡng / Gel", name: "Kem đêm Estee Lauder Revitalizing Supreme + Night", note: "Ban đêm" },
  { key: "f18", scope: "face", group: "Mặt nạ", name: "Mặt nạ Wonjin phục hồi 8 CICA" },
  { key: "f19", scope: "face", group: "Mặt nạ", name: "Mặt nạ Histolab Peppermint" },
  { key: "f20", scope: "face", group: "Mặt nạ", name: "Mặt nạ Histolab Natural White" },
  { key: "f21", scope: "face", group: "Chống nắng", name: "Kem chống nắng SPF 30–50 PA+++", note: "Mỗi sáng" },

  { key: "h01", scope: "hair", group: "Tẩy da chết da đầu", name: "Tẩy da chết da đầu Cocoon bồ kết" },
  { key: "h02", scope: "hair", group: "Dầu gội", name: "Dầu gội Loreal Serioxyl Advanced" },
  { key: "h03", scope: "hair", group: "Dầu xả", name: "Dầu xả Loreal Absolut Repair Gold", note: "Thân & ngọn tóc" },
  { key: "h04", scope: "hair", group: "Dầu xả", name: "Dầu xả Dove Derma Scalp", note: "Da đầu" },
  { key: "h05", scope: "hair", group: "Ủ tóc", name: "Bơ ủ tóc Mielle" },
  { key: "h06", scope: "hair", group: "Serum", name: "Serum Dove Hairfall recovery" },
  { key: "h07", scope: "hair", group: "Dầu dưỡng", name: "Dầu dưỡng tóc Kerastase Elixir Ultime", note: "Phần ngọn" },
  { key: "h08", scope: "hair", group: "Dầu dưỡng", name: "Dầu Mielle Rosemary Mint Scalp & Hair Oil" },
  { key: "h09", scope: "hair", group: "Dầu dưỡng", name: "Dầu hoa hồng ủ chân tóc" },
  { key: "h10", scope: "hair", group: "Dầu dưỡng", name: "Tinh dầu bưởi Cocoon" },

  { key: "b01", scope: "body", group: "Tẩy da chết", name: "Tẩy da chết cơ thể cà phê Cocoon", note: "2 lần/tuần" },
  { key: "b02", scope: "body", group: "Dầu dưỡng", name: "Dầu khô đa năng Nuxe Huile Multi", note: "Thoa khi da còn ẩm" },
  { key: "b03", scope: "body", group: "Kem dưỡng", name: "Kem dưỡng ẩm Vaseline Gluta Hya Night", note: "Trước khi ngủ" },
];

type SeedStep = [string, string?];
type SeedDay = { short: string; full: string; focus: string; sections: { key: string; steps: SeedStep[] }[] };

const AM_OPEN: SeedStep[] = [["f22"], ["f04"]];
const AM_CLOSE: SeedStep[] = [["f16"], ["f21", "Bắt buộc — thoa lại sau 3–4 tiếng nếu ra ngoài"]];
const faceAM = (serum: string, note?: string): SeedStep[] => [...AM_OPEN, [serum, note], ...AM_CLOSE];
const CLEANSE: SeedStep[] = [["f01"], ["f02"]];
const differinPM: SeedStep[] = [...CLEANSE,
  ["f04", "Vỗ nhẹ rồi đợi da khô hẳn 10–15 phút"],
  ["f08", "Lượng bằng hạt đậu cho cả mặt, tán mỏng vùng hay nổi mụn · tránh khoé mắt, cánh mũi, khoé miệng"],
  ["f17", "Dày hơn gel cream — giảm khô, bong do Differin"]];

export function faceWeek(acid: string, acidNote: string, maskFri: string, maskSun: string): SeedDay[] {
  return [
    { short: "T2", full: "Thứ Hai", focus: "Differin", sections: [
      { key: "am", steps: faceAM("f10", "Củng cố hàng rào da trước đêm Differin") },
      { key: "pm", steps: differinPM }] },
    { short: "T3", full: "Thứ Ba", focus: "Làm sạch sâu + mặt nạ", sections: [
      { key: "am", steps: faceAM("f11", "Sáng da, chống oxy hoá — hỗ trợ mờ thâm") },
      { key: "pm", steps: [...CLEANSE,
        ["f03", "Tạo bọt rồi mát-xa nhẹ ~1 phút, rửa sạch — giữ lỗ chân lông thông thoáng, hạn chế sợi bã nhờn"],
        ["f05", "Làm dịu ngay sau bước làm sạch sâu"],
        ["f18", "Đắp 15–20 phút — mặt nạ phục hồi thứ 1 trong tuần"],
        ["f13"], ["f15"]] }] },
    { short: "T4", full: "Thứ Tư", focus: "Differin", sections: [
      { key: "am", steps: faceAM("f10", "Củng cố hàng rào da trước đêm Differin") },
      { key: "pm", steps: differinPM }] },
    { short: "T5", full: "Thứ Năm", focus: "Trị thâm", sections: [
      { key: "am", steps: faceAM("f11", "Kết hợp tốt với Azelaic tối nay để mờ thâm") },
      { key: "pm", steps: [...CLEANSE, ["f05"],
        ["f09", "Mờ thâm, dịu mụn viêm — thoa kỹ vùng thâm"],
        ["f14", "Dùng đúng vào đêm Azelaic"], ["f17"]] }] },
    { short: "T6", full: "Thứ Sáu", focus: "Mặt nạ phục hồi", sections: [
      { key: "am", steps: faceAM("f11") },
      { key: "pm", steps: [...CLEANSE, ["f05", "Đêm đệm — để da nghỉ trước đêm acid ngày mai"],
        [maskFri, "Đắp 15–20 phút — mặt nạ phục hồi thứ 2 trong tuần"], ["f12"], ["f15"]] }] },
    { short: "T7", full: "Thứ Bảy", focus: "BHA / AHA", sections: [
      { key: "am", steps: faceAM("f10", "Củng cố hàng rào da trước đêm acid") },
      { key: "pm", steps: [...CLEANSE, [acid, acidNote],
        ["f13", "Làm dịu & phục hồi sau acid"],
        ["f15", "Nhẹ, kiềm dầu, giữ da thông thoáng sau acid"]] }] },
    { short: "CN", full: "Chủ Nhật", focus: "Phục hồi sâu", sections: [
      { key: "am", steps: [["f22"], ["f05", "Sáng nghỉ active — da vừa qua đêm acid"], ["f12"], ...AM_CLOSE] },
      { key: "pm", steps: [...CLEANSE, ["f05"],
        [maskSun, "Đắp 15–20 phút — mặt nạ phục hồi thứ 3 trong tuần"],
        ["f13"], ["f17", "Dưỡng sâu, chuẩn bị cho đêm Differin T2"]] }] },
  ];
}

export const hairWeek = (): SeedDay[] => [
  { short: "T2", full: "Thứ Hai", focus: "Gội + tẩy da chết da đầu", sections: [{ key: "day", steps: [
    ["h01", "Massage trước khi gội, để 5–10 phút rồi gội sạch"], ["h02"], ["h03", "Dưỡng thân & ngọn tóc"],
    ["h06", "Thoa từ chân đến ngọn sau khi lau khô bớt nước"], ["h07", "Thoa nhẹ phần ngọn"]] }] },
  { short: "T3", full: "Thứ Ba", focus: "Nghỉ gội — dưỡng da đầu", sections: [{ key: "day", steps: [
    ["h08", "Massage da đầu, để thẩm thấu tự nhiên"], ["h07", "Chỉ thoa nếu ngọn tóc khô"]] }] },
  { short: "T4", full: "Thứ Tư", focus: "Gội + ủ tóc chuyên sâu", sections: [{ key: "day", steps: [
    ["h02"], ["h05", "Thoa từ giữa thân đến ngọn, ủ 15–20 phút rồi xả sạch"], ["h04", "Dưỡng da đầu"], ["h06"], ["h07"]] }] },
  { short: "T5", full: "Thứ Năm", focus: "Nghỉ gội — kích thích mọc tóc", sections: [{ key: "day", steps: [
    ["h09", "Massage chân tóc, để qua đêm nếu có thể"]] }] },
  { short: "T6", full: "Thứ Sáu", focus: "Ngày gội", sections: [{ key: "day", steps: [["h02"], ["h03"], ["h06"], ["h07"]] }] },
  { short: "T7", full: "Thứ Bảy", focus: "Nghỉ gội — dưỡng da đầu", sections: [{ key: "day", steps: [
    ["h10", "Massage da đầu, để qua đêm, gội sạch sáng hôm sau nếu cần"]] }] },
  { short: "CN", full: "Chủ Nhật", focus: "Nghỉ hoàn toàn", sections: [{ key: "day", steps: [["h07", "Chỉ thoa nhẹ phần ngọn nếu cần"]] }] },
];

const bodyDay = (short: string, full: string, focus: string, exfo: boolean): SeedDay => ({
  short, full, focus,
  sections: [
    { key: "am", steps: exfo
      ? [["b01", "Chà nhẹ nhàng trong lúc tắm — khuỷu tay, đầu gối, gót chân"], ["b02", "Thoa ngay sau khi tắm"]]
      : [["b02", "Thoa lên da còn ẩm ngay sau khi tắm"]] },
    { key: "pm", steps: [["b03", "Thoa toàn thân trước khi ngủ"]] },
  ],
});
export const bodyWeek = (): SeedDay[] => [
  bodyDay("T2", "Thứ Hai", "Cấp ẩm hàng ngày", false),
  bodyDay("T3", "Thứ Ba", "Cấp ẩm hàng ngày", false),
  bodyDay("T4", "Thứ Tư", "Ngày tẩy da chết", true),
  bodyDay("T5", "Thứ Năm", "Cấp ẩm hàng ngày", false),
  bodyDay("T6", "Thứ Sáu", "Cấp ẩm hàng ngày", false),
  bodyDay("T7", "Thứ Bảy", "Cấp ẩm hàng ngày", false),
  bodyDay("CN", "Chủ Nhật", "Ngày tẩy da chết", true),
];

export const DEFAULT_ROUTINES: Record<Scope, Record<"A" | "B", SeedDay[]>> = {
  face: {
    A: faceWeek("f06", "Tuần 1 & 3 — BHA 2% · tránh vùng mắt, không dùng Differin tối nay", "f19", "f18"),
    B: faceWeek("f07", "Tuần 2 & 4 — AHA 8% · tránh vùng mắt, không dùng Differin tối nay", "f18", "f20"),
  },
  hair: { A: hairWeek(), B: hairWeek() },
  body: { A: bodyWeek(), B: bodyWeek() },
};
