/** Thống kê thói quen chăm da: bao nhiêu bước theo lịch đã được tick mỗi ngày. */
import type { Scope } from "./defaults";
import { dateKey, dayIndex, parseKey, weekOf } from "./dates";
import type { State } from "./types";

const SCOPES: Scope[] = ["face", "hair", "body"];
/** Ngày đạt từ ngần này phần trăm số bước thì tính là "giữ thói quen" (dùng cho chuỗi ngày) */
export const GOOD_DAY = 0.8;

export type DayStat = { key: string; planned: number; done: number; ratio: number; byScope: Record<Scope, [number, number]> };

export function dayStat(state: State, key: string): DayStat {
  const d = parseKey(key);
  const w = weekOf(d, state.settings.cycleStart);
  const i = dayIndex(d);
  const byScope = { face: [0, 0], hair: [0, 0], body: [0, 0] } as Record<Scope, [number, number]>;
  let planned = 0, done = 0;
  for (const scope of SCOPES) {
    for (const sec of state.routines[scope][w]?.[i]?.sections ?? []) {
      for (const st of sec.steps) {
        planned++; byScope[scope][1]++;
        if (state.checks[key]?.[`${scope}:${sec.key}:${st.p}`]) { done++; byScope[scope][0]++; }
      }
    }
  }
  return { key, planned, done, ratio: planned ? done / planned : 0, byScope };
}

/** Các ngày từ `from` đến `to` (bao gồm cả hai đầu), dạng YYYY-MM-DD */
export function daysBetween(from: Date, to: Date) {
  const out: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (d <= to) { out.push(dateKey(d)); d.setDate(d.getDate() + 1); }
  return out;
}

/** Chuỗi ngày liên tiếp đạt GOOD_DAY, tính lùi từ hôm nay (hôm nay chưa xong thì bắt đầu từ hôm qua) */
export function streak(state: State) {
  const d = new Date();
  if (dayStat(state, dateKey(d)).ratio < GOOD_DAY) d.setDate(d.getDate() - 1);
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const s = dayStat(state, dateKey(d));
    if (s.planned && s.ratio >= GOOD_DAY) { n++; d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}

/** Số lần đã dùng mỗi sản phẩm (theo tick) trong danh sách ngày */
export function productUse(state: State, keys: string[]) {
  const n: Record<string, number> = {};
  for (const k of keys) for (const id of Object.keys(state.checks[k] ?? {})) {
    const pid = id.split(":")[2];
    n[pid] = (n[pid] ?? 0) + 1;
  }
  return n;
}

/** Quý chứa ngày d: [ngày đầu quý, ngày cuối quý] */
export function quarterOf(d: Date): [Date, Date] {
  const q = Math.floor(d.getMonth() / 3);
  return [new Date(d.getFullYear(), q * 3, 1), new Date(d.getFullYear(), q * 3 + 3, 0)];
}
