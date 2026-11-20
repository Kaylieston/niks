/**
 * Hoạt chất chính của sản phẩm và các cặp hay "đánh nhau" trên da.
 * Sản phẩm chỉ có tên + ghi chú, nên mặc định app tự đoán hoạt chất từ chữ; người dùng có thể chọn lại trong form sản phẩm.
 */
import type { Product } from "./types";

export type IngKey =
  | "retinoid" | "aha" | "bha" | "vitc" | "bpo" | "azelaic" | "niacinamide"
  | "exfoliant" | "soothing" | "hydrating" | "spf";

export type IngDef = { key: IngKey; vi: string; en: string; color: string; active: boolean; match?: RegExp };

export const INGREDIENTS: IngDef[] = [
  { key: "retinoid", vi: "Retinoid", en: "Retinoid", color: "#C9B8CC", active: true,
    match: /retin|adapalen|differin|tretinoin|retinal|tazarot/i },
  { key: "aha", vi: "AHA", en: "AHA", color: "#F2C879", active: true,
    match: /\baha\b|glycolic|lactic|mandelic|gluconolact|\bpha\b/i },
  { key: "bha", vi: "BHA", en: "BHA", color: "#EFA9BA", active: true,
    match: /\bbha\b|salicyl/i },
  { key: "vitc", vi: "Vitamin C", en: "Vitamin C", color: "#FCE3A6", active: true,
    match: /vitamin\s*c\b|vit\.?\s*c\b|ascorb|\bc22\b/i },
  { key: "bpo", vi: "Benzoyl peroxide", en: "Benzoyl peroxide", color: "#DCA2A7", active: true,
    match: /benzoyl|\bbpo\b/i },
  { key: "azelaic", vi: "Azelaic acid", en: "Azelaic acid", color: "#E8B7A0", active: true,
    match: /azela|azecont/i },
  { key: "niacinamide", vi: "Niacinamide", en: "Niacinamide", color: "#CBD3A8", active: false,
    match: /niacinamid|vitamin\s*b3/i },
  { key: "exfoliant", vi: "Tẩy da chết", en: "Scrub / peel", color: "#BCC7A2", active: true },
  { key: "soothing", vi: "Làm dịu", en: "Soothing", color: "#A8B58A", active: false,
    match: /centella|cica|madecass|panthenol|aloe|keo ong|propolis|allantoin|heartleaf|oat\b|làm dịu|phục hồi|restor|calm/i },
  { key: "hydrating", vi: "Cấp ẩm", en: "Hydrating", color: "#A9B7C6", active: false,
    match: /hyaluron|ceramid|squalan|glycerin|hydra|moistur|cấp ẩm|dưỡng ẩm|gel cream/i },
  { key: "spf", vi: "Chống nắng", en: "Sunscreen", color: "#FCE3A6", active: false, match: /\bspf\b|sunscreen|chống nắng/i },
];
export const ING_BY_KEY = Object.fromEntries(INGREDIENTS.map((i) => [i.key, i])) as Record<IngKey, IngDef>;
export const ACTIVE_KEYS = INGREDIENTS.filter((i) => i.active).map((i) => i.key);

const GROUP_DEFAULT: Record<string, IngKey[]> = {
  "Tẩy da chết": ["exfoliant"],
  "Chống nắng": ["spf"],
  "Kem dưỡng / Gel": ["hydrating"],
};

/** Hoạt chất đoán từ tên, ghi chú và loại sản phẩm */
export function guessIngredients(p: Pick<Product, "name" | "note" | "group">): IngKey[] {
  // Hoạt chất mạnh chỉ đoán theo tên (ghi chú hay nhắc tới sản phẩm khác, VD "Đêm dùng Azelaic")
  const full = `${p.name} ${p.note}`;
  const out = new Set<IngKey>(GROUP_DEFAULT[p.group] ?? []);
  for (const i of INGREDIENTS) if (i.match && i.match.test(i.active ? p.name : full)) out.add(i.key);
  return [...out];
}

/** Hoạt chất của sản phẩm: lựa chọn của người dùng nếu có, không thì đoán */
export function ingredientsOf(p: Pick<Product, "name" | "note" | "group"> & { ingredients?: string }): IngKey[] {
  const raw = (p.ingredients ?? "").trim();
  if (raw === "none") return [];
  if (raw) return raw.split(",").filter((k) => k in ING_BY_KEY) as IngKey[];
  return guessIngredients(p);
}

export const ingName = (k: IngKey, lang: "vi" | "en") => (lang === "en" ? ING_BY_KEY[k].en : ING_BY_KEY[k].vi);

/* ---------------- Kiểm tra xung đột ---------------- */

export type Level = "avoid" | "caution";
export type Rule = { a: IngKey[]; b: IngKey[]; level: Level; vi: string; en: string };

export const RULES: Rule[] = [
  { a: ["retinoid"], b: ["aha", "bha"], level: "avoid",
    vi: "Retinoid và acid tẩy da chết cùng một lúc rất dễ gây đỏ, rát, bong tróc. Dùng xen kẽ các tối.",
    en: "A retinoid and an exfoliating acid together often cause redness, stinging and peeling. Alternate nights." },
  { a: ["retinoid"], b: ["bpo"], level: "avoid",
    vi: "Benzoyl peroxide có thể làm retinol / tretinoin mất tác dụng và làm da khô rát. Dùng BPO buổi sáng, retinoid buổi tối.",
    en: "Benzoyl peroxide can deactivate retinol / tretinoin and dries skin out. Use BPO in the morning and the retinoid at night." },
  { a: ["vitc"], b: ["bpo"], level: "avoid",
    vi: "Benzoyl peroxide oxy hoá vitamin C nên cả hai đều kém hiệu quả. Tách sang buổi hoặc ngày khác.",
    en: "Benzoyl peroxide oxidises vitamin C, so both work less well. Use them at different times." },
  { a: ["aha"], b: ["bha"], level: "caution",
    vi: "Hai loại acid cùng lúc dễ tẩy da chết quá tay. Mỗi lần chọn một thôi.",
    en: "Two acids at once can over-exfoliate. Pick one per routine." },
  { a: ["retinoid"], b: ["vitc"], level: "caution",
    vi: "Vitamin C hợp buổi sáng, retinoid hợp buổi tối. Dùng chung dễ châm chích.",
    en: "Vitamin C suits mornings and retinoids suit evenings. Together they can sting." },
  { a: ["aha", "bha"], b: ["vitc"], level: "caution",
    vi: "Acid và vitamin C cùng lúc dễ châm chích. Tách sáng / tối.",
    en: "Acids and vitamin C together can sting. Split them between AM and PM." },
  { a: ["exfoliant"], b: ["retinoid", "aha", "bha"], level: "caution",
    vi: "Tẩy da chết cùng đêm với hoạt chất mạnh dễ làm tổn thương hàng rào da.",
    en: "A scrub or peel on the same night as a strong active can damage your skin barrier." },
];

export type Clash = { a: Product; b: Product; ia: IngKey; ib: IngKey; rule: Rule };

/** Các cặp sản phẩm xung đột trong cùng một buổi */
export function findClashes(products: Product[]): Clash[] {
  const out: Clash[] = [];
  const ings = products.map((p) => ingredientsOf(p));
  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      if (products[i].id === products[j].id) continue;
      for (const rule of RULES) {
        const hit = matchRule(rule, ings[i], ings[j]);
        if (hit) { out.push({ a: products[i], b: products[j], ia: hit[0], ib: hit[1], rule }); break; }
      }
    }
  }
  // "Tránh" lên trước "lưu ý"
  return out.sort((x, y) => (x.rule.level === y.rule.level ? 0 : x.rule.level === "avoid" ? -1 : 1));
}

function matchRule(rule: Rule, x: IngKey[], y: IngKey[]): [IngKey, IngKey] | null {
  for (const a of rule.a) for (const b of rule.b) {
    if (x.includes(a) && y.includes(b)) return [a, b];
    if (y.includes(a) && x.includes(b)) return [b, a];
  }
  return null;
}

/** Sản phẩm `p` có xung đột với sản phẩm nào trong `others` không (dùng khi chọn thêm bước) */
export function clashWith(p: Product, others: Product[]): Clash | null {
  return findClashes([p, ...others.filter((o) => o.id !== p.id)]).find((c) => c.a.id === p.id || c.b.id === p.id) ?? null;
}

/** Lưu ý riêng cho buổi sáng */
export function amWarnings(products: Product[]) {
  return products.filter((p) => ingredientsOf(p).includes("retinoid"));
}
