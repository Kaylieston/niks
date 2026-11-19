"use client";
/** Hai ngôn ngữ: Tiếng Việt (mặc định) và English. Lựa chọn lưu trên từng thiết bị. */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ProductStatus, Scope } from "./defaults";

export type Lang = "vi" | "en";
const KEY = "niks-lang";

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangCtx = createContext<Ctx>({ lang: "vi", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");
  useEffect(() => {
    try { const v = localStorage.getItem(KEY); if (v === "en" || v === "vi") setLangState(v); } catch {}
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch {}
  }, []);
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

/** Dùng trong component: const { tr, lang } = useI18n(); tr("Xin chào", "Hello") */
export function useI18n() {
  const { lang, setLang } = useContext(LangCtx);
  const tr = useCallback((vi: string, en: string) => (lang === "en" ? en : vi), [lang]);
  return { lang, setLang, tr, L: labels(lang) };
}

const GROUP_EN: Record<string, string> = {
  "Tẩy trang": "Makeup remover", "Sữa rửa mặt": "Cleanser", "Tẩy da chết": "Exfoliant", "Toner": "Toner",
  "Active (acid / retinoid)": "Active (acid / retinoid)", "Serum": "Serum", "Kem dưỡng / Gel": "Moisturiser / Gel",
  "Mặt nạ": "Mask", "Chống nắng": "Sunscreen", "Tẩy da chết da đầu": "Scalp scrub", "Dầu gội": "Shampoo",
  "Dầu xả": "Conditioner", "Ủ tóc": "Hair mask", "Dầu dưỡng": "Oil", "Kem dưỡng": "Body cream",
};

const VI = {
  days: ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"],
  dow: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  scope: { face: "Da mặt", hair: "Tóc", body: "Cơ thể" } as Record<Scope, string>,
  status: { active: "Đang dùng", paused: "Tạm ngưng", empty: "Hết", wish: "Muốn mua" } as Record<ProductStatus, string>,
  week: { A: "Tuần 1 & 3", B: "Tuần 2 & 4" } as Record<string, string>,
  section: {
    face: { am: ["Buổi sáng", "Chăm da ban ngày"], pm: ["Buổi tối", "Chăm da ban đêm"] },
    hair: { day: ["Chăm tóc hôm nay", "Các bước trong ngày"] },
    body: { am: ["Sau khi tắm", "Chăm thể ban ngày"], pm: ["Trước khi ngủ", "Chăm thể ban đêm"] },
  } as Record<Scope, Record<string, [string, string]>>,
  todayGroups: [["Buổi sáng", "Trước khi ra khỏi nhà"], ["Buổi tối", "Trước khi ngủ"], ["Tóc hôm nay", "Gội & dưỡng da đầu"]],
  month: (m: number) => `Tháng ${m + 1}`,
  dateLong: (d: Date) => `${VI.days[(d.getDay() + 6) % 7]}, ${d.getDate()} tháng ${d.getMonth() + 1}`,
};
type Labels = typeof VI & { group: (g: string) => string };

const EN: typeof VI = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  dow: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  scope: { face: "Face", hair: "Hair", body: "Body" },
  status: { active: "In use", paused: "Paused", empty: "Used up", wish: "Wishlist" },
  week: { A: "Weeks 1 & 3", B: "Weeks 2 & 4" },
  section: {
    face: { am: ["Morning", "Daytime skincare"], pm: ["Evening", "Night-time skincare"] },
    hair: { day: ["Hair care today", "Today's steps"] },
    body: { am: ["After shower", "Daytime body care"], pm: ["Before bed", "Night-time body care"] },
  },
  todayGroups: [["Morning", "Before you head out"], ["Evening", "Before bed"], ["Hair today", "Wash & scalp care"]],
  month: (m: number) => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m],
  dateLong: (d: Date) => `${EN.days[(d.getDay() + 6) % 7]}, ${d.getDate()} ${EN.month(d.getMonth()).slice(0, 3)}`,
};

export function labels(lang: Lang): Labels {
  const base = lang === "en" ? EN : VI;
  return { ...base, group: (g: string) => (lang === "en" ? GROUP_EN[g] ?? g : g) };
}
