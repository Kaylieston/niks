import { prisma } from "./prisma";
import { thisMonday } from "./dates";
import type { Scope } from "./defaults";
import { legacySkinKey } from "./skin";

export type AppState = {
  settings: { cycleStart: string };
  products: { id: string; scope: Scope; group: string; name: string; note: string; status: string; openedAt: string; paoMonths: number }[];
  routines: Record<Scope, Record<"A" | "B", any[]>>;
  checks: Record<string, Record<string, boolean>>;
  moods: Record<string, { mood: string; note: string }>;
  skin: Record<string, { tags: string[]; note: string }>;
};

const DEFAULT_SETTINGS = { cycleStart: thisMonday() };

export async function loadState(): Promise<AppState> {
  const [settingRows, products, days, skinLogs, checks, moods] = await Promise.all([
    prisma.setting.findMany(),
    prisma.product.findMany({ orderBy: [{ scope: "asc" }, { order: "asc" }] }),
    prisma.routineDay.findMany({
      orderBy: [{ scope: "asc" }, { week: "asc" }, { dayIndex: "asc" }],
      include: { sections: { orderBy: { order: "asc" }, include: { steps: { orderBy: { order: "asc" } } } } },
    }),
    prisma.skinLog.findMany({ orderBy: { date: "asc" } }),
    prisma.check.findMany(),
    prisma.moodEntry.findMany({ orderBy: { date: "asc" } }),
  ]);

  const settings: any = { ...DEFAULT_SETTINGS };
  for (const row of settingRows) if (row.key === "cycleStart") settings.cycleStart = row.value;

  const routines: any = { face: { A: [], B: [] }, hair: { A: [], B: [] }, body: { A: [], B: [] } };
  for (const d of days) {
    routines[d.scope][d.week][d.dayIndex] = {
      short: d.short, full: d.full, focus: d.focus,
      sections: d.sections.map((s) => ({
        key: s.key,
        steps: s.steps.map((st) => ({ p: st.productId, n: st.note })),
      })),
    };
  }


  const checkMap: AppState["checks"] = {};
  for (const c of checks) {
    (checkMap[c.date] ||= {})[`${c.scope}:${c.sectionKey}:${c.productId}`] = true;
  }

  const moodMap: AppState["moods"] = {};
  // Tình trạng da: bản ghi mới ở SkinLog; ngày chưa có thì lấy nhãn da cũ đã chọn cùng cảm xúc
  const skinMap: AppState["skin"] = {};
  for (const m of moods) {
    moodMap[m.date] = { mood: m.mood, note: m.note };
    const tags = (m.skin ? m.skin.split(",") : []).map(legacySkinKey).filter(Boolean) as string[];
    if (tags.length) skinMap[m.date] = { tags, note: "" };
  }
  for (const s of skinLogs) skinMap[s.date] = { tags: s.tags ? s.tags.split(",") : [], note: s.note };

  return {
    settings,
    products: products.map((p) => ({
      id: p.id, scope: p.scope as Scope, group: p.group, name: p.name, note: p.note, status: p.status,
      openedAt: p.openedAt, paoMonths: p.paoMonths,
    })),
    routines,
    checks: checkMap,
    moods: moodMap,
    skin: skinMap,
  };
}

export async function getSetting(key: string, fallback: string) {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}
