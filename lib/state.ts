import { prisma } from "./prisma";
import { thisMonday } from "./dates";
import type { Scope } from "./defaults";

export type AppState = {
  settings: { cycleStart: string; reminderTime: string; reminderEnabled: boolean };
  products: { id: string; scope: Scope; group: string; name: string; note: string; status: string }[];
  routines: Record<Scope, Record<"A" | "B", any[]>>;
  journal: Record<string, { acne: number; dark: number; dry: number; sting: number; note: string }>;
  checks: Record<string, Record<string, boolean>>;
};

const DEFAULT_SETTINGS = { cycleStart: thisMonday(), reminderTime: "21:00", reminderEnabled: false };

export async function loadState(): Promise<AppState> {
  const [settingRows, products, days, journal, checks] = await Promise.all([
    prisma.setting.findMany(),
    prisma.product.findMany({ orderBy: [{ scope: "asc" }, { order: "asc" }] }),
    prisma.routineDay.findMany({
      orderBy: [{ scope: "asc" }, { week: "asc" }, { dayIndex: "asc" }],
      include: { sections: { orderBy: { order: "asc" }, include: { steps: { orderBy: { order: "asc" } } } } },
    }),
    prisma.journalEntry.findMany({ orderBy: { date: "asc" } }),
    prisma.check.findMany(),
  ]);

  const settings: any = { ...DEFAULT_SETTINGS };
  for (const row of settingRows) {
    if (row.key === "reminderEnabled") settings.reminderEnabled = row.value === "true";
    else settings[row.key] = row.value;
  }

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

  const journalMap: AppState["journal"] = {};
  for (const j of journal) journalMap[j.date] = { acne: j.acne, dark: j.dark, dry: j.dry, sting: j.sting, note: j.note };

  const checkMap: AppState["checks"] = {};
  for (const c of checks) {
    (checkMap[c.date] ||= {})[`${c.scope}:${c.sectionKey}:${c.productId}`] = true;
  }

  return {
    settings,
    products: products.map((p) => ({ id: p.id, scope: p.scope as Scope, group: p.group, name: p.name, note: p.note, status: p.status })),
    routines,
    journal: journalMap,
    checks: checkMap,
  };
}

export async function getSetting(key: string, fallback: string) {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}
