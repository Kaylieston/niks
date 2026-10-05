/** Mọi ngày trong app là chuỗi YYYY-MM-DD theo giờ địa phương của thiết bị. */
export const dateKey = (d: Date = new Date()) => {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
export const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
/** Thứ Hai = 0 ... Chủ Nhật = 6 */
export const dayIndex = (d: Date) => (d.getDay() + 6) % 7;

/** Tuần A hay B của chu kỳ 2 tuần, tính từ ngày bắt đầu chu kỳ */
export function weekOf(d: Date, cycleStart: string): "A" | "B" {
  const start = parseKey(cycleStart);
  start.setDate(start.getDate() - dayIndex(start));
  const diff = Math.floor(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start.getTime()) / 86400000
  );
  const wk = Math.floor(diff / 7);
  return (((wk % 2) + 2) % 2) === 0 ? "A" : "B";
}

export function thisMonday() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateKey(d);
}
