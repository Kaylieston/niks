/**
 * "Tối nay dùng gì?": chọn sản phẩm trong tủ đồ dựa trên tình trạng da hôm nay, hồ sơ da và lịch tối nay.
 * Da kích ứng → bỏ retinoid, acid, vitamin C, BPO, tẩy da chết; ưu tiên sản phẩm làm dịu.
 */
import { dateKey, dayIndex, parseKey, weekOf } from "./dates";
import { ACTIVE_KEYS, ingredientsOf, type IngKey } from "./ingredients";
import { sensitiveIngredients } from "./profile";
import type { Product, State } from "./types";

type Role = "remover" | "cleanser" | "exfoliant" | "toner" | "treatment" | "serum" | "mask" | "moisturiser";
const ROLE_BY_GROUP: Record<string, Role> = {
  "Tẩy trang": "remover", "Sữa rửa mặt": "cleanser", "Tẩy da chết": "exfoliant", "Toner": "toner",
  "Active (acid / retinoid)": "treatment", "Serum": "serum", "Mặt nạ": "mask", "Kem dưỡng / Gel": "moisturiser",
};
const ORDER: Role[] = ["remover", "cleanser", "exfoliant", "toner", "treatment", "mask", "serum", "moisturiser"];

export type Mode = "soothe" | "hydrate" | "clear" | "balance" | "plan" | "rest";
export type Pick = { p: Product; role: Role; why: [string, string] };
export type Skip = { p: Product; why: [string, string] };
export type Tonight = { mode: Mode; tags: string[]; fromDate: string | null; picks: Pick[]; skips: Skip[]; restAfter?: Product };

const has = (p: Product, k: IngKey) => ingredientsOf(p).includes(k);
const isActive = (p: Product) => ingredientsOf(p).some((k) => ACTIVE_KEYS.includes(k));
const MORNING = /buổi sáng|morning|ban ngày|\bam\b|nước ấm/i;
const RICH = /đêm|night|repair|rich|balm|barrier|ceramid/i;
const LIGHT = /gel|light|nhẹ|kiềm dầu|winter melon/i;

/** Lịch tối nay của da mặt */
export function plannedTonight(state: State, date = dateKey()): string[] {
  const d = parseKey(date);
  const day = state.routines.face[weekOf(d, state.settings.cycleStart)]?.[dayIndex(d)];
  return day?.sections.find((s) => s.key === "pm")?.steps.map((s) => s.p) ?? [];
}

export function pickTonight(state: State, date = dateKey()): Tonight {
  const profile = state.settings.skinProfile;
  const sens = sensitiveIngredients(profile);
  // tình trạng da: hôm nay, nếu chưa ghi thì lấy hôm qua
  const y = parseKey(date); y.setDate(y.getDate() - 1);
  const yk = dateKey(y);
  const fromDate = state.skin[date]?.tags.length ? date : state.skin[yk]?.tags.length ? yk : null;
  const tags = fromDate ? state.skin[fromDate].tags : [];
  const irritated = tags.some((t) => ["red", "sensitive", "flaky"].includes(t)) || (profile?.type === "sensitive" && tags.includes("dry"));
  const dry = tags.some((t) => ["dry", "flaky"].includes(t));
  const acne = tags.includes("acne");
  const oily = tags.includes("oily");
  const good = tags.some((t) => ["glowy", "calm"].includes(t)) && !irritated && !dry && !acne;

  // tối qua đã dùng hoạt chất mạnh?
  const byId = Object.fromEntries(state.products.map((p) => [p.id, p]));
  const lastNight = Object.keys(state.checks[yk] ?? {})
    .filter((k) => k.startsWith("face:pm:")).map((k) => byId[k.split(":")[2]]).filter(Boolean) as Product[];
  const restAfter = lastNight.find((p) => has(p, "retinoid") || has(p, "aha") || has(p, "bha") || has(p, "exfoliant"));

  const planned = plannedTonight(state, date);
  const shelf = state.products.filter((p) => p.scope === "face" && p.status === "active");
  const skips: Skip[] = [];
  const blocked = (p: Product): [string, string] | null => {
    const ing = ingredientsOf(p);
    if (ing.includes("spf")) return ["Chống nắng chỉ cần ban ngày", "Sunscreen is for daytime"];
    const s = ing.find((k) => sens.includes(k));
    if (s) return ["Bạn ghi là nhạy cảm với hoạt chất này", "You marked this ingredient as one you react to"];
    if (irritated && isActive(p)) return ["Da đang kích ứng: cho da nghỉ hoạt chất mạnh", "Skin is irritated: give it a break from strong actives"];
    if (dry && (has(p, "aha") || has(p, "bha") || has(p, "exfoliant") || has(p, "bpo")))
      return ["Da đang khô: tạm bỏ acid và tẩy da chết", "Skin is dry: skip acids and exfoliation for now"];
    if (has(p, "vitc")) return ["Vitamin C hợp buổi sáng hơn", "Vitamin C works best in the morning"];
    if (restAfter && restAfter.id !== p.id && isActive(p) && !has(p, "azelaic"))
      return [`Tối qua đã dùng ${restAfter.name}, cho da nghỉ một tối`, `You used ${restAfter.name} last night, so rest tonight`];
    if (restAfter && restAfter.id === p.id && !has(p, "azelaic")) return ["Đã dùng tối qua", "Used last night"];
    return null;
  };

  const ok = shelf.filter((p) => {
    const why = blocked(p);
    if (why && (planned.includes(p.id) || isActive(p))) skips.push({ p, why });
    return !why;
  });
  const by = (r: Role) => ok.filter((p) => ROLE_BY_GROUP[p.group] === r);
  const plannedBonus = (p: Product) => (planned.includes(p.id) ? 2 : 0);
  const best = (list: Product[], score: (p: Product) => number) =>
    list.map((p) => ({ p, s: score(p) + plannedBonus(p) })).sort((a, b) => b.s - a.s)[0]?.p;

  const concerns = profile?.concerns ?? [];
  const picks: Pick[] = [];
  const add = (p: Product | undefined, role: Role, why: [string, string]) => { if (p && !picks.some((x) => x.p.id === p.id)) picks.push({ p, role, why }); };

  add(by("remover")[0], "remover", ["Gỡ kem chống nắng và bụi bẩn", "Takes off sunscreen and grime"]);
  add(best(by("cleanser").filter((p) => !MORNING.test(p.note) && !MORNING.test(p.name)), () => 0) ?? by("cleanser")[0], "cleanser", ["Làm sạch nhẹ nhàng", "Gentle cleanse"]);
  add(best(by("toner").filter((p) => !isActive(p)), (p) => (irritated || dry) && has(p, "soothing") ? 4 : 0), "toner",
    irritated ? ["Toner làm dịu", "A calming toner"] : ["Cân bằng da", "Preps the skin"]);

  // một hoạt chất điều trị (không dùng khi da kích ứng)
  let treatment: Product | undefined;
  if (!irritated) {
    const cands = ok.filter((p) => isActive(p) && !has(p, "exfoliant") && ROLE_BY_GROUP[p.group] !== "mask");
    const score = (p: Product) => {
      let s = 0;
      if (acne) s += has(p, "bha") ? 4 : has(p, "bpo") ? 4 : has(p, "azelaic") ? 3 : has(p, "retinoid") ? 2 : 0;
      if (oily) s += has(p, "bha") ? 2 : 0;
      if (concerns.includes("darkspots")) s += has(p, "azelaic") ? 2 : has(p, "aha") ? 1 : 0;
      if (concerns.includes("aging")) s += has(p, "retinoid") ? 3 : 0;
      if (concerns.includes("texture")) s += has(p, "aha") ? 2 : has(p, "retinoid") ? 1 : 0;
      if (concerns.includes("acne")) s += has(p, "bha") || has(p, "azelaic") ? 1 : 0;
      if (good || !tags.length) s += planned.includes(p.id) ? 3 : 0;
      return s;
    };
    const top = cands.map((p) => ({ p, s: score(p) + plannedBonus(p) })).sort((a, b) => b.s - a.s)[0];
    if (top && top.s > 0) treatment = top.p;
  }
  if (treatment) add(treatment, "treatment", acne ? ["Hoạt chất xử lý mụn tối nay", "Tonight's breakout treatment"] : planned.includes(treatment.id) ? ["Theo lịch tối nay", "On tonight's plan"] : ["Hợp với mục tiêu da của bạn", "Fits your skin goals"]);
  // các hoạt chất khác bị gác lại để tránh chồng chéo
  for (const p of ok) if (isActive(p) && p.id !== treatment?.id && planned.includes(p.id) && ROLE_BY_GROUP[p.group] !== "mask")
    skips.push({ p, why: ["Một hoạt chất mỗi tối là đủ", "One active per night is enough"] });

  if (irritated || dry) add(best(by("mask"), (p) => (has(p, "soothing") ? 3 : 0) + (has(p, "hydrating") ? 1 : 0)), "mask",
    irritated ? ["Đắp 15 phút để da dịu lại", "15 minutes to calm things down"] : ["Cấp ẩm thêm cho da khô", "Extra moisture for dry skin"]);
  else if (planned.some((id) => ROLE_BY_GROUP[byId[id]?.group] === "mask")) add(by("mask").find((p) => planned.includes(p.id)), "mask", ["Theo lịch tối nay", "On tonight's plan"]);

  const serums = by("serum").filter((p) => !isActive(p) && p.id !== treatment?.id);
  add(best(serums, (p) => (irritated || dry || treatment) && has(p, "soothing") ? 4 : acne && has(p, "niacinamide") ? 3 : oily && has(p, "niacinamide") ? 2 : has(p, "hydrating") && dry ? 3 : 0), "serum",
    irritated ? ["Phục hồi hàng rào da", "Repairs the skin barrier"] : treatment ? ["Làm dịu sau hoạt chất", "Calms skin after the active"] : ["Dưỡng thêm một lớp", "An extra layer of care"]);
  add(best(by("moisturiser"), (p) => (dry || irritated ? (RICH.test(p.name + " " + p.note) ? 4 : 0) : 0) + (oily ? (LIGHT.test(p.name + " " + p.note) ? 4 : 0) : 0)
    + (RICH.test(p.name) ? 1 : 0) - (MORNING.test(p.note) ? 3 : 0)), "moisturiser",
    dry || irritated ? ["Khoá ẩm dày hơn cho đêm nay", "A richer layer to seal in moisture"] : oily ? ["Mỏng nhẹ, không bí da", "Light and breathable"] : ["Khoá ẩm qua đêm", "Locks in moisture overnight"]);

  picks.sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role));
  const uniqSkips = skips.filter((s, i) => skips.findIndex((x) => x.p.id === s.p.id) === i && !picks.some((x) => x.p.id === s.p.id));
  const mode: Mode = irritated ? "soothe" : dry ? "hydrate" : acne ? "clear" : oily ? "balance" : restAfter && !treatment ? "rest" : "plan";
  return { mode, tags, fromDate, picks, skips: uniqSkips.slice(0, 5), restAfter };
}
