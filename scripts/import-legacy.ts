/**
 * Nạp file routine-backup.json (xuất từ bản HTML cũ) vào database.
 * Dùng: npx tsx scripts/import-legacy.ts ./routine-backup.json
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const file = process.argv[2];
if (!file) { console.error("Thiếu đường dẫn tới file JSON"); process.exit(1); }

async function main() {
  const legacy = JSON.parse(readFileSync(file, "utf8"));

  await prisma.$transaction([
    prisma.check.deleteMany(), prisma.step.deleteMany(), prisma.section.deleteMany(),
    prisma.routineDay.deleteMany(), prisma.product.deleteMany(), prisma.journalEntry.deleteMany(),
  ]);

  const idByLegacy: Record<string, string> = {};
  for (const [i, p] of legacy.products.entries()) {
    const created = await prisma.product.create({
      data: { scope: p.scope, group: p.group, name: p.name, note: p.note ?? "", status: p.status ?? "active", order: i },
    });
    idByLegacy[p.id] = created.id;
  }

  for (const scope of ["face", "hair", "body"] as const) {
    for (const week of ["A", "B"] as const) {
      for (const [dayIndex, day] of legacy.routines[scope][week].entries()) {
        await prisma.routineDay.create({
          data: {
            scope, week, dayIndex, short: day.short, full: day.full, focus: day.focus ?? "",
            sections: {
              create: day.sections.map((sec: any, si: number) => ({
                key: sec.key, order: si,
                steps: {
                  create: sec.steps
                    .filter((st: any) => idByLegacy[st.p])
                    .map((st: any, i: number) => ({ productId: idByLegacy[st.p], note: st.n ?? "", order: i })),
                },
              })),
            },
          },
        });
      }
    }
  }

  for (const [date, e] of Object.entries<any>(legacy.journal ?? {})) {
    await prisma.journalEntry.create({
      data: { date, acne: e.acne ?? 1, dark: e.dark ?? 1, dry: e.dry ?? 1, sting: e.sting ?? 1, note: e.note ?? "" },
    });
  }

  for (const [date, map] of Object.entries<any>(legacy.checks ?? {})) {
    for (const key of Object.keys(map)) {
      const [scope, sectionKey, legacyPid] = key.split(":");
      const productId = idByLegacy[legacyPid];
      if (!productId) continue;
      await prisma.check.create({ data: { date, scope: scope as any, sectionKey, productId } }).catch(() => null);
    }
  }

  for (const [key, value] of Object.entries<any>(legacy.settings ?? {})) {
    await prisma.setting.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } });
  }

  console.log("Nạp xong dữ liệu cũ.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
