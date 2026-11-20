import type { Scope, ProductStatus } from "./defaults";
import type { SkinProfile } from "./profile";

export type Product = {
  id: string; scope: Scope; group: string; name: string; note: string; status: ProductStatus;
  openedAt: string; paoMonths: number; ingredients: string;
};
export type Step = { p: string; n: string };
export type Day = { short: string; full: string; focus: string; sections: { key: string; steps: Step[] }[] };
export type State = {
  settings: { cycleStart: string; skinProfile: SkinProfile | null };
  products: Product[];
  routines: Record<Scope, Record<"A" | "B", Day[]>>;
  checks: Record<string, Record<string, boolean>>;
  moods: Record<string, { mood: string; note: string }>;
  skin: Record<string, { tags: string[]; note: string }>;
};
export type Mutate = (label: string, fn: () => Promise<any>) => Promise<boolean>;
