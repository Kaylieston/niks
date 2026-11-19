import type { Scope, ProductStatus } from "./defaults";

export type Product = {
  id: string; scope: Scope; group: string; name: string; note: string; status: ProductStatus;
  openedAt: string; paoMonths: number;
};
export type Step = { p: string; n: string };
export type Day = { short: string; full: string; focus: string; sections: { key: string; steps: Step[] }[] };
export type State = {
  settings: { cycleStart: string };
  products: Product[];
  routines: Record<Scope, Record<"A" | "B", Day[]>>;
  checks: Record<string, Record<string, boolean>>;
  moods: Record<string, { mood: string; note: string }>;
  skin: Record<string, { tags: string[]; note: string }>;
};
export type Mutate = (label: string, fn: () => Promise<any>) => Promise<boolean>;
