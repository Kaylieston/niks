/** Hồ sơ da: câu hỏi trắc nghiệm + gợi ý riêng dựa trên câu trả lời và tủ đồ hiện có. */
import { ING_BY_KEY, ingredientsOf, type IngKey } from "./ingredients";
import type { Product } from "./types";

export type SkinType = "dry" | "oily" | "combo" | "normal" | "sensitive";
export type Concern = "acne" | "darkspots" | "redness" | "aging" | "pores" | "dehydration" | "texture";
export type Sensitivity = "fragrance" | "retinoid" | "acids" | "vitc" | "bpo";
export type SkinProfile = { type: SkinType; concerns: Concern[]; sensitivities: Sensitivity[]; updated: string };

type Opt<K extends string> = { key: K; vi: string; en: string; hintVi: string; hintEn: string; emoji: string };

export const TYPE_OPTS: Opt<SkinType>[] = [
  { key: "dry", vi: "Da khô", en: "Dry", emoji: "🏜️", hintVi: "Hay căng, bong nhẹ, ít dầu", hintEn: "Feels tight, sometimes flaky" },
  { key: "oily", vi: "Da dầu", en: "Oily", emoji: "💧", hintVi: "Bóng dầu cả mặt sau vài tiếng", hintEn: "Shiny all over by midday" },
  { key: "combo", vi: "Da hỗn hợp", en: "Combination", emoji: "🌗", hintVi: "Dầu vùng chữ T, khô hai má", hintEn: "Oily T-zone, drier cheeks" },
  { key: "normal", vi: "Da thường", en: "Normal", emoji: "🌤️", hintVi: "Khá cân bằng, ít vấn đề", hintEn: "Fairly balanced" },
  { key: "sensitive", vi: "Da nhạy cảm", en: "Sensitive", emoji: "🌸", hintVi: "Dễ đỏ, châm chích khi đổi sản phẩm", hintEn: "Reddens or stings easily" },
];
export const CONCERN_OPTS: Opt<Concern>[] = [
  { key: "acne", vi: "Mụn", en: "Breakouts", emoji: "🔴", hintVi: "", hintEn: "" },
  { key: "darkspots", vi: "Thâm, đốm nâu", en: "Dark spots", emoji: "🟤", hintVi: "", hintEn: "" },
  { key: "redness", vi: "Đỏ, kích ứng", en: "Redness", emoji: "🌹", hintVi: "", hintEn: "" },
  { key: "aging", vi: "Nếp nhăn", en: "Fine lines", emoji: "⏳", hintVi: "", hintEn: "" },
  { key: "pores", vi: "Lỗ chân lông", en: "Pores", emoji: "🔍", hintVi: "", hintEn: "" },
  { key: "dehydration", vi: "Thiếu nước", en: "Dehydration", emoji: "💦", hintVi: "", hintEn: "" },
  { key: "texture", vi: "Sần, không đều", en: "Rough texture", emoji: "🪨", hintVi: "", hintEn: "" },
];
export const SENS_OPTS: Opt<Sensitivity>[] = [
  { key: "fragrance", vi: "Hương liệu", en: "Fragrance", emoji: "🌺", hintVi: "", hintEn: "" },
  { key: "retinoid", vi: "Retinoid", en: "Retinoids", emoji: "🌙", hintVi: "", hintEn: "" },
  { key: "acids", vi: "Acid (AHA / BHA)", en: "Acids (AHA / BHA)", emoji: "🍋", hintVi: "", hintEn: "" },
  { key: "vitc", vi: "Vitamin C", en: "Vitamin C", emoji: "🍊", hintVi: "", hintEn: "" },
  { key: "bpo", vi: "Benzoyl peroxide", en: "Benzoyl peroxide", emoji: "🧪", hintVi: "", hintEn: "" },
];

/** Hoạt chất mà người dùng ghi là nhạy cảm */
export function sensitiveIngredients(p: SkinProfile | null): IngKey[] {
  if (!p) return [];
  const out: IngKey[] = [];
  for (const s of p.sensitivities) {
    if (s === "retinoid") out.push("retinoid");
    if (s === "acids") out.push("aha", "bha");
    if (s === "vitc") out.push("vitc");
    if (s === "bpo") out.push("bpo");
  }
  return out;
}

/** Hoạt chất nên tìm cho từng vấn đề, xếp theo độ ưu tiên */
const FOR_CONCERN: Record<Concern, IngKey[]> = {
  acne: ["bha", "azelaic", "niacinamide", "bpo", "retinoid"],
  darkspots: ["azelaic", "vitc", "niacinamide", "aha"],
  redness: ["soothing", "azelaic", "niacinamide"],
  aging: ["retinoid", "vitc", "hydrating"],
  pores: ["bha", "niacinamide", "retinoid"],
  dehydration: ["hydrating", "soothing"],
  texture: ["aha", "retinoid", "bha"],
};
const FOR_TYPE: Record<SkinType, IngKey[]> = {
  dry: ["hydrating"], oily: ["niacinamide", "bha"], combo: ["niacinamide"], normal: [], sensitive: ["soothing"],
};

export type Suggestion = {
  key: IngKey; score: number;
  have: Product[]; // sản phẩm trong tủ đã có hoạt chất này
};

export type Tailored = {
  lookFor: Suggestion[];
  avoid: { key: IngKey; products: Product[] }[];
  tips: [string, string][]; // [vi, en]
};

export function tailor(profile: SkinProfile, products: Product[]): Tailored {
  const sens = sensitiveIngredients(profile);
  const scores: Partial<Record<IngKey, number>> = {};
  for (const c of profile.concerns) FOR_CONCERN[c].forEach((k, i) => { scores[k] = (scores[k] ?? 0) + (5 - i); });
  FOR_TYPE[profile.type].forEach((k) => { scores[k] = (scores[k] ?? 0) + 3; });
  // da nhạy cảm: bớt ưu tiên hoạt chất mạnh
  if (profile.type === "sensitive") for (const k of ["retinoid", "aha", "bpo"] as IngKey[]) if (scores[k]) scores[k]! -= 3;
  const shelf = products.filter((p) => p.scope === "face" && p.status !== "wish");
  const lookFor = (Object.entries(scores) as [IngKey, number][])
    .filter(([k, s]) => s > 0 && !sens.includes(k))
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([key, score]) => ({ key, score, have: shelf.filter((p) => p.status === "active" && ingredientsOf(p).includes(key)) }));
  const avoid = sens.map((key) => ({ key, products: shelf.filter((p) => p.status === "active" && ingredientsOf(p).includes(key)) }));

  const tips: [string, string][] = [];
  const t = profile.type;
  if (t === "dry") tips.push(["Rửa mặt dịu nhẹ, thoa kem dưỡng khi da còn ẩm.", "Use a gentle cleanser and moisturise while skin is still damp."]);
  if (t === "oily") tips.push(["Đừng bỏ kem dưỡng: chọn dạng gel mỏng nhẹ.", "Don't skip moisturiser: pick a light gel texture."]);
  if (t === "combo") tips.push(["Có thể dùng BHA riêng vùng chữ T, dưỡng ẩm kỹ hai má.", "Use BHA on the T-zone only and moisturise cheeks well."]);
  if (t === "sensitive") tips.push(["Thử sản phẩm mới ở vùng nhỏ 2–3 ngày trước khi dùng cả mặt.", "Patch-test new products on a small area for 2–3 days first."]);
  if (profile.concerns.includes("acne")) tips.push(["Không nặn mụn; dùng hoạt chất trị mụn đều đặn ít nhất 6–8 tuần mới thấy rõ.", "Don't pick; give acne actives 6–8 weeks of steady use."]);
  if (profile.concerns.includes("darkspots")) tips.push(["Thâm mờ nhanh hơn nhiều khi chống nắng mỗi ngày.", "Dark spots fade much faster with daily sunscreen."]);
  if (profile.concerns.includes("aging")) tips.push(["Bắt đầu retinoid 2 tối/tuần rồi tăng dần.", "Start a retinoid 2 nights a week and build up slowly."]);
  if (profile.concerns.includes("redness")) tips.push(["Nước ấm thay vì nước nóng, tránh chà xát mạnh.", "Use lukewarm water and avoid scrubbing."]);
  if (profile.concerns.includes("dehydration")) tips.push(["Uống đủ nước và thêm một lớp serum cấp ẩm.", "Drink enough water and layer a hydrating serum."]);
  if (profile.sensitivities.includes("fragrance")) tips.push(["Đọc bảng thành phần: tránh \"parfum / fragrance\" và tinh dầu.", "Check labels for \"parfum / fragrance\" and essential oils."]);
  return { lookFor, avoid, tips: tips.slice(0, 4) };
}

export const ingLabel = (k: IngKey, lang: "vi" | "en") => (lang === "en" ? ING_BY_KEY[k].en : ING_BY_KEY[k].vi);
