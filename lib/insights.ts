/**
 * Tìm mối liên hệ trong dữ liệu: da trước / sau khi bắt đầu một hoạt chất, cảm xúc và những ngày bỏ routine,
 * da hôm sau những đêm dùng acid… Chỉ đưa ra nhận xét khi đủ dữ liệu, và nói rõ đây là tương quan.
 */
import { dateKey, parseKey } from "./dates";
import { dayStat } from "./habits";
import { ING_BY_KEY, ingredientsOf, type IngKey } from "./ingredients";
import { SKIN_BY_KEY } from "./skin";
import type { State } from "./types";

export type Insight = {
  id: string; tone: "good" | "watch" | "info"; icon: string;
  vi: string; en: string; detailVi: string; detailEn: string; strength: number;
};

const LOW_MOODS = new Set(["tired", "sleepy", "sad", "anxious", "stressed", "grumpy"]);
const BAD_TAGS: { key: string; vi: string; en: string }[] = [
  { key: "acne", vi: "Mụn", en: "Breakouts" },
  { key: "red", vi: "Ửng đỏ", en: "Redness" },
  { key: "dry", vi: "Da khô", en: "Dryness" },
  { key: "oily", vi: "Đổ dầu", en: "Oiliness" },
  { key: "flaky", vi: "Bong tróc", en: "Flaking" },
  { key: "sensitive", vi: "Châm chích", en: "Stinging" },
];
const STARTABLE: IngKey[] = ["niacinamide", "retinoid", "aha", "bha", "azelaic", "vitc", "bpo", "soothing"];
const pct = (x: number) => Math.round(x * 100);
const ingVi = (k: IngKey) => ING_BY_KEY[k].vi.toLowerCase().replace("retinoid", "retinoid");
const ingEn = (k: IngKey) => (k === "vitc" || k === "aha" || k === "bha" ? ING_BY_KEY[k].en : ING_BY_KEY[k].en.toLowerCase());

export function insights(state: State, today = new Date()): { list: Insight[]; logged: number; need: number } {
  const out: Insight[] = [];
  const skinDays = Object.keys(state.skin).filter((k) => state.skin[k].tags.length).sort();
  const byId = Object.fromEntries(state.products.map((p) => [p.id, p]));
  const todayKey = dateKey(today);

  // 1. Da trước / sau khi bắt đầu dùng một hoạt chất (lần tick đầu tiên)
  const firstUse: Partial<Record<IngKey, string>> = {};
  for (const day of Object.keys(state.checks).sort()) {
    for (const k of Object.keys(state.checks[day])) {
      const [scope, , pid] = k.split(":");
      const p = byId[pid];
      if (scope !== "face" || !p) continue;
      for (const ing of ingredientsOf(p)) if (STARTABLE.includes(ing) && !firstUse[ing]) firstUse[ing] = day;
    }
  }
  for (const [ing, start] of Object.entries(firstUse) as [IngKey, string][]) {
    const before = skinDays.filter((d) => d < start);
    const after = skinDays.filter((d) => d >= start && d <= todayKey);
    if (before.length < 5 || after.length < 7) continue;
    for (const bad of BAD_TAGS) {
      const rb = before.filter((d) => state.skin[d].tags.includes(bad.key)).length / before.length;
      const ra = after.filter((d) => state.skin[d].tags.includes(bad.key)).length / after.length;
      if (rb < 0.2) continue;
      const change = (ra - rb) / rb;
      if (change <= -0.25) {
        out.push({
          id: `start-${ing}-${bad.key}`, tone: "good", icon: "📉", strength: -change + 0.2,
          vi: `${bad.vi} giảm ${pct(-change)}% từ khi bạn bắt đầu dùng ${ingVi(ing)}`,
          en: `${bad.en} dropped ${pct(-change)}% since you started ${ingEn(ing)}`,
          detailVi: `${pct(rb)}% số ngày trước đó → ${pct(ra)}% từ ${fmt(start, "vi")} (${before.length} và ${after.length} ngày đã ghi).`,
          detailEn: `${pct(rb)}% of days before → ${pct(ra)}% since ${fmt(start, "en")} (${before.length} and ${after.length} logged days).`,
        });
      } else if (change >= 0.5 && ra >= 0.3) {
        out.push({
          id: `start-${ing}-${bad.key}-up`, tone: "watch", icon: "👀", strength: change * 0.6,
          vi: `${bad.vi} xuất hiện nhiều hơn từ khi bắt đầu ${ingVi(ing)}`,
          en: `${bad.en} has shown up more since you started ${ingEn(ing)}`,
          detailVi: `${pct(rb)}% → ${pct(ra)}% số ngày. Nếu kéo dài quá 4–6 tuần, thử giảm tần suất.`,
          detailEn: `${pct(rb)}% → ${pct(ra)}% of days. If it lasts beyond 4–6 weeks, try using it less often.`,
        });
      }
    }
  }

  // 2. Cảm xúc thấp và những ngày bỏ routine
  const moodDays = Object.keys(state.moods).filter((d) => d <= todayKey);
  const withPlan = moodDays.map((d) => ({ d, s: dayStat(state, d), low: LOW_MOODS.has(state.moods[d].mood) })).filter((x) => x.s.planned);
  const skipped = withPlan.filter((x) => x.s.ratio < 0.5);
  const kept = withPlan.filter((x) => x.s.ratio >= 0.8);
  if (skipped.length >= 4 && kept.length >= 4) {
    const ls = skipped.filter((x) => x.low).length / skipped.length;
    const lk = kept.filter((x) => x.low).length / kept.length;
    if (ls - lk >= 0.2) {
      out.push({
        id: "mood-skip", tone: "info", icon: "🫶", strength: ls - lk + 0.3,
        vi: "Những ngày tâm trạng thấp thường trùng với ngày bỏ routine",
        en: "Low mood days line up with skipped routines",
        detailVi: `${pct(ls)}% ngày bỏ routine là ngày mệt / buồn / căng thẳng, so với ${pct(lk)}% ngày làm đủ. Những hôm như vậy, chỉ cần rửa mặt + dưỡng ẩm là được rồi.`,
        detailEn: `${pct(ls)}% of skipped days were tired / sad / stressed days, vs ${pct(lk)}% of complete days. On those days, cleanse + moisturise is plenty.`,
      });
    }
  }

  // 3. Làm đủ routine → da đẹp hơn?
  const skinWithPlan = skinDays.filter((d) => d <= todayKey).map((d) => ({ d, s: dayStat(state, d) })).filter((x) => x.s.planned);
  const isGood = (d: string) => {
    const t = state.skin[d].tags;
    return t.some((x) => SKIN_BY_KEY[x]?.good) && !t.some((x) => SKIN_BY_KEY[x] && !SKIN_BY_KEY[x].good);
  };
  // da hôm sau phản ánh routine hôm trước
  const pairs = skinWithPlan.map(({ d }) => {
    const prev = parseKey(d); prev.setDate(prev.getDate() - 1);
    return { d, prev: dayStat(state, dateKey(prev)) };
  }).filter((x) => x.prev.planned);
  const hi = pairs.filter((x) => x.prev.ratio >= 0.8), lo = pairs.filter((x) => x.prev.ratio < 0.5);
  if (hi.length >= 5 && lo.length >= 3) {
    const gh = hi.filter((x) => isGood(x.d)).length / hi.length, gl = lo.filter((x) => isGood(x.d)).length / lo.length;
    if (gh - gl >= 0.2) out.push({
      id: "routine-skin", tone: "good", icon: "✨", strength: gh - gl + 0.1,
      vi: `Da đẹp hơn ${gl ? `${(gh / gl).toFixed(1)}×` : "hẳn"} vào hôm sau những ngày làm đủ routine`,
      en: `Happy-skin days are ${gl ? `${(gh / gl).toFixed(1)}×` : "far"} more likely after a full routine`,
      detailVi: `${pct(gh)}% hôm sau ngày làm ≥ 80% là ngày da đẹp, so với ${pct(gl)}% sau ngày làm < 50%.`,
      detailEn: `${pct(gh)}% of days after a ≥ 80% day were happy-skin days, vs ${pct(gl)}% after a < 50% day.`,
    });
  }

  // 4. Da hôm sau những đêm dùng acid / retinoid
  const strong = (day: string) => Object.keys(state.checks[day] ?? {}).some((k) => {
    const p = byId[k.split(":")[2]];
    return k.startsWith("face:pm:") && p && ingredientsOf(p).some((i) => ["aha", "bha", "retinoid"].includes(i));
  });
  const after = skinDays.map((d) => { const p = parseKey(d); p.setDate(p.getDate() - 1); return { d, act: strong(dateKey(p)) }; });
  const act = after.filter((x) => x.act), rest = after.filter((x) => !x.act);
  if (act.length >= 4 && rest.length >= 4) {
    const irr = (d: string) => state.skin[d].tags.some((t) => ["red", "sensitive", "flaky"].includes(t));
    const ra = act.filter((x) => irr(x.d)).length / act.length, rr = rest.filter((x) => irr(x.d)).length / rest.length;
    if (ra - rr >= 0.2) out.push({
      id: "active-irritation", tone: "watch", icon: "🌙", strength: ra - rr,
      vi: "Da hay đỏ / châm chích vào hôm sau đêm dùng acid hoặc retinoid",
      en: "Redness or stinging tends to follow acid or retinoid nights",
      detailVi: `${pct(ra)}% so với ${pct(rr)}% các ngày khác. Thêm một bước làm dịu hoặc giãn các đêm hoạt chất ra.`,
      detailEn: `${pct(ra)}% vs ${pct(rr)}% on other days. Add a soothing step or space your active nights further apart.`,
    });
  }

  const need = 14;
  return { list: out.sort((a, b) => b.strength - a.strength).slice(0, 4), logged: skinDays.length, need };
}

function fmt(k: string, lang: "vi" | "en") {
  const d = parseKey(k);
  return lang === "en" ? `${d.getDate()}/${d.getMonth() + 1}` : `${d.getDate()}/${d.getMonth() + 1}`;
}
