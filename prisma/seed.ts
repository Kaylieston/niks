import { PrismaClient } from "@prisma/client";
import { SEED_PRODUCTS, DEFAULT_ROUTINES, Scope } from "../lib/defaults";
import { thisMonday } from "../lib/dates";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log(`Đã có ${existing} sản phẩm trong DB — bỏ qua seed. Dùng \`npx prisma migrate reset\` nếu muốn tạo lại.`);
    return;
  }

  // 1. Sản phẩm
  const idByKey: Record<string, string> = {};
  for (const [i, p] of SEED_PRODUCTS.entries()) {
    const created = await prisma.product.create({
      data: { scope: p.scope as any, group: p.group, name: p.name, note: p.note ?? "", status: "active", order: i },
    });
    idByKey[p.key] = created.id;
  }

  // 2. Lịch 2 tuần
  for (const scope of ["face", "hair", "body"] as Scope[]) {
    for (const week of ["A", "B"] as const) {
      const days = DEFAULT_ROUTINES[scope][week];
      for (const [dayIndex, day] of days.entries()) {
        await prisma.routineDay.create({
          data: {
            scope: scope as any, week, dayIndex, short: day.short, full: day.full, focus: day.focus,
            sections: {
              create: day.sections.map((sec, si) => ({
                key: sec.key, order: si,
                steps: {
                  create: sec.steps.map(([key, note], idx) => ({
                    productId: idByKey[key], note: note ?? "", order: idx,
                  })),
                },
              })),
            },
          },
        });
      }
    }
  }

  // 3. Cài đặt mặc định
  await prisma.setting.createMany({
    data: [
      { key: "cycleStart", value: thisMonday() },
      { key: "reminderTime", value: "21:00" },
      { key: "reminderEnabled", value: "false" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed xong: sản phẩm, lịch 2 tuần và cài đặt mặc định.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
