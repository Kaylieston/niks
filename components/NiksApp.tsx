"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TODAY_GROUPS, type Scope } from "@/lib/defaults";
import { dateKey, dayIndex, parseKey, weekOf } from "@/lib/dates";
import { streak as calcStreak } from "@/lib/habits";
import { LangProvider, useI18n } from "@/lib/i18n";
import { QUICK_MOODS, moodName } from "@/lib/moods";
import type { Mutate, State, Step } from "@/lib/types";
import { G, MoodBlob, ProductArt, productLook } from "./art";
import { Ring, Sheet, api } from "./ui";
import RoutineView from "./RoutineView";
import ShelfView, { paoInfo } from "./ShelfView";
import MoodView from "./MoodView";
import ProgressView from "./ProgressView";

/** Tên người dùng hiển thị — sẽ lấy từ tài khoản khi có chức năng đăng nhập */
const USER_NAME = "Kaylie";

type Tab = "today" | "routine" | "progress" | "shelf" | "mood";
const TABS: Tab[] = ["today", "routine", "progress", "shelf", "mood"];
export type RoutineTarget = { scope: Scope; section: string; nonce: number };

export default function NiksApp() {
  return <LangProvider><App /></LangProvider>;
}

function App() {
  const { tr } = useI18n();
  const [state, setState] = useState<State | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [routineTarget, setRoutineTarget] = useState<RoutineTarget | null>(null);
  const [moodPick, setMoodPick] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/state");
    if (!res.ok) throw new Error(tr("Không tải được dữ liệu", "Couldn't load your data"));
    setState(await res.json());
  }, [tr]);

  useEffect(() => { refresh().catch((e) => setError(e.message)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Có bản mới: service worker mới tự kích hoạt, tải lại trang một lần để dùng ngay
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    const onChange = () => { if (hadController && !reloaded) { reloaded = true; window.location.reload(); } };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    let reg: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker.register("/sw.js").then((r) => { reg = r; r.update().catch(() => {}); }).catch(() => {});
    // Mở lại app từ nền (iPhone giữ app trong bộ nhớ) cũng kiểm tra bản mới
    const onVisible = () => { if (document.visibilityState === "visible") reg?.update().catch(() => {}); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2200);
    return () => clearTimeout(t);
  }, [toastMsg]);
  useEffect(() => { document.body.dataset.tab = tab; }, [tab]);

  // Thanh tab ẩn khi cuộn xuống, hiện lại khi cuộn lên (hoặc khi gần đầu / cuối trang)
  const [navHidden, setNavHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY, ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 4;
        if (y < 40 || atBottom) setNavHidden(false);
        else if (y > lastY + 6) setNavHidden(true);
        else if (y < lastY - 6) setNavHidden(false);
        if (Math.abs(y - lastY) > 6) lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** Gửi thay đổi lên server rồi tải lại state. */
  const mutate: Mutate = useCallback(async (label, fn) => {
    setBusy(label);
    try { await fn(); await refresh(); setError(null); return true; }
    catch (e: any) { setError(e.message); return false; }
    finally { setBusy(null); }
  }, [refresh]);

  const go = (t: Tab) => { setTab(t); setNavHidden(false); window.scrollTo({ top: 0 }); };

  if (error && !state) return <div className="boot"><img src="/icons/icon-192.png" alt="" /><p>{tr("Không tải được dữ liệu", "Couldn't load your data")}: {error}</p></div>;
  if (!state) return <div className="boot"><img src="/icons/icon-192.png" alt="" className="pulse" /><p>{tr("Đang tải Niks…", "Loading Niks…")}</p></div>;

  return (
    <div className="app">
      {tab === "progress" && <div className="pbg" aria-hidden="true" />}
      <main className="views">
        {tab === "today" && (
          <TodayView state={state} setState={setState} openSettings={() => setSettings(true)}
            startRoutine={(scope, section) => { setRoutineTarget({ scope, section, nonce: Date.now() }); go("routine"); }}
            pickMood={(k) => { setMoodPick(k); go("mood"); }} goShelf={() => go("shelf")} goProgress={() => go("progress")} />
        )}
        {tab === "routine" && <RoutineView state={state} setState={setState} mutate={mutate} target={routineTarget} toast={setToastMsg} />}
        {tab === "progress" && <ProgressView state={state} />}
        {tab === "shelf" && <ShelfView state={state} mutate={mutate} toast={setToastMsg} />}
        {tab === "mood" && <MoodView state={state} mutate={mutate} preselect={moodPick} clearPreselect={() => setMoodPick(null)} toast={setToastMsg} goProgress={() => go("progress")} />}
      </main>

      <nav className={`tabbar ${navHidden ? "hide" : ""}`} aria-label={tr("Điều hướng chính", "Main navigation")}
        style={{ ["--i" as any]: TABS.indexOf(tab) }}>
        <span className="tab-blob" aria-hidden="true" />
        <TabBtn on={tab === "today"} label={tr("Hôm nay", "Today")} icon="home" onClick={() => go("today")} />
        <TabBtn on={tab === "routine"} label={tr("Lịch trình", "Routine")} icon="routine" onClick={() => go("routine")} />
        <TabBtn on={tab === "progress"} label={tr("Tiến độ", "Progress")} icon="progress" onClick={() => go("progress")} />
        <TabBtn on={tab === "shelf"} label={tr("Tủ đồ", "Shelf")} icon="shelf" onClick={() => go("shelf")} />
        <TabBtn on={tab === "mood"} label={tr("Cảm xúc", "Mood")} icon="mood" onClick={() => go("mood")} />
      </nav>

      <Sheet open={settings} onClose={() => setSettings(false)} title={tr("Cài đặt", "Settings")}>
        <SettingsPanel state={state} mutate={mutate} />
      </Sheet>

      <div className={`toast ${toastMsg ? "on" : ""}`} role="status">{toastMsg}</div>
      {busy && <div className="saving">{tr("Đang lưu", "Saving")} {busy}…</div>}
      {error && <div className="saving err">{error}</div>}
    </div>
  );
}

function TabBtn({ on, label, icon, onClick }: { on: boolean; label: string; icon: "home" | "routine" | "progress" | "shelf" | "mood"; onClick: () => void }) {
  return (
    <button className="tab" aria-current={on ? "page" : undefined} onClick={onClick}>
      <G name={icon} />{label}
    </button>
  );
}

/* ================= HÔM NAY ================= */
function TodayView({ state, setState, openSettings, startRoutine, pickMood, goShelf, goProgress }: {
  state: State; setState: (s: State) => void; openSettings: () => void;
  startRoutine: (scope: Scope, section: string) => void; pickMood: (k: string) => void; goShelf: () => void; goProgress: () => void;
}) {
  const { tr, L, lang } = useI18n();
  const now = new Date();
  const dk = dateKey(now);
  const wk = weekOf(now, state.settings.cycleStart);
  const di = dayIndex(now);
  const faceDay = state.routines.face[wk]?.[di];
  const tod = now.getHours() < 12 ? "am" : "pm";
  const heroSec = faceDay?.sections.find((s) => s.key === tod);
  const heroDone = (heroSec?.steps ?? []).filter((st) => state.checks[dk]?.[`face:${tod}:${st.p}`]).length;
  const heroTotal = heroSec?.steps.length ?? 0;
  const todayMood = state.moods[dk];

  const streak = useMemo(() => calcStreak(state), [state]);

  const expiring = state.products.filter((p) => p.status === "active" && paoInfo(p)?.soon);
  const wish = state.products.filter((p) => p.status === "wish");

  const toggle = (scope: Scope, key: string, pid: string, done: boolean) => {
    const checks = { ...state.checks, [dk]: { ...(state.checks[dk] ?? {}) } };
    if (done) checks[dk][`${scope}:${key}:${pid}`] = true;
    else delete checks[dk][`${scope}:${key}:${pid}`];
    setState({ ...state, checks });
    fetch("/api/checks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dk, scope, sectionKey: key, productId: pid, done }),
    }).catch(() => {});
  };
  const byId = useMemo(() => Object.fromEntries(state.products.map((p) => [p.id, p])), [state.products]);

  return (
    <section className="view">
      <div className="top">
        <img className="logo" src="/icons/icon-192.png" alt="" />
        <div className="grow">
          <div className="sub">{L.dateLong(now)}</div>
          <h1>Hi {USER_NAME}</h1>
        </div>
        <button className="iconbtn" aria-label={tr("Cài đặt", "Settings")} onClick={openSettings}><G name="gear" size={20} /></button>
      </div>

      <div className="hero">
        <span className="chip glass">{L.week[wk]} · {faceDay?.focus || tr("Ngày thường", "Regular day")}</span>
        <h2>{tod === "am" ? tr("Routine buổi sáng", "Morning routine") : tr("Routine buổi tối", "Evening routine")}</h2>
        <p>{heroTotal ? tr(`${heroTotal} bước · đã xong ${heroDone}`, `${heroTotal} steps · ${heroDone} done`) : tr("Hôm nay không có bước nào.", "Nothing planned today.")}</p>
        <button className="pill" onClick={() => startRoutine("face", tod)}>
          {heroDone && heroDone < heroTotal ? tr("Làm tiếp", "Continue") : tr("Bắt đầu", "Start")} <G name="arrow" size={16} width={2.5} />
        </button>
        <img className="moon" src="/icons/icon-512.png" alt="" />
        <div className="hero-ring"><Ring value={heroTotal ? heroDone / heroTotal : 0} /></div>
      </div>

      <div className="card">
        <div className="label">{tr("Check-in mỗi ngày", "Daily check-in")}</div>
        <div className="h3">{todayMood ? tr(`Hôm nay bạn thấy ${moodName(todayMood.mood, "vi").toLowerCase()}`, `Today you feel ${moodName(todayMood.mood, "en").toLowerCase()}`) : tr("Hôm nay bạn thấy thế nào?", "How are you feeling today?")}</div>
        <div className="quickmood">
          {QUICK_MOODS.map((k) => (
            <button key={k} onClick={() => pickMood(k)} aria-pressed={todayMood?.mood === k}>
              <MoodBlob mood={k} size={44} />{moodName(k, lang)}
            </button>
          ))}
        </div>
      </div>

      <div className="twocol">
        <button className="mini sky" onClick={goProgress}>
          <div className="label">{tr("Chuỗi ngày", "Streak")}</div>
          <div className="big">{tr(`${streak} ngày`, `${streak} day${streak === 1 ? "" : "s"}`)}</div>
          <div className="small">{tr("Hoàn thành từ 80% các bước mỗi ngày", "Days with 80%+ of steps done")}</div>
        </button>
        <button className="mini blush" onClick={goShelf}>
          <div className="label">{expiring.length ? tr("Sắp hết hạn", "Expiring soon") : tr("Muốn mua", "Wishlist")}</div>
          <div className="big">{expiring.length || wish.length} {tr("món", (expiring.length || wish.length) === 1 ? "item" : "items")}</div>
          <div className="small">{expiring.length ? expiring.map((p) => p.name).slice(0, 2).join(", ") : tr("Mở tủ đồ để xem", "Open your shelf")}</div>
        </button>
      </div>

      {TODAY_GROUPS.map((g, gi) => {
        const rows: { scope: Scope; key: string; step: Step }[] = [];
        for (const [scope, key] of g.parts) {
          const sec = state.routines[scope][wk]?.[di]?.sections.find((s) => s.key === key);
          for (const step of sec?.steps ?? []) rows.push({ scope, key, step });
        }
        if (!rows.length) return null;
        const done = rows.filter((r) => state.checks[dk]?.[`${r.scope}:${r.key}:${r.step.p}`]).length;
        const [s0, k0] = g.parts[0];
        return (
          <div className={`card group ${g.tone}`} key={g.title}>
            <div className="group-head">
              <div className="grow"><div className="h3">{L.todayGroups[gi][0]}</div><div className="small">{L.todayGroups[gi][1]}</div></div>
              <span className="count">{done}/{rows.length}</span>
              <button className="pill soft sm" onClick={() => startRoutine(s0, k0)}>{tr("Xem minh hoạ", "Walkthrough")}</button>
            </div>
            <div className="bar"><i style={{ width: `${Math.round((done / rows.length) * 100)}%` }} /></div>
            <ul className="checklist">
              {rows.map(({ scope, key, step }) => {
                const on = !!state.checks[dk]?.[`${scope}:${key}:${step.p}`];
                const p = byId[step.p];
                return (
                  <li key={`${scope}-${key}-${step.p}`}>
                    <label className={`check-row ${on ? "done" : ""}`}>
                      <input type="checkbox" checked={on} onChange={(e) => toggle(scope, key, step.p, e.target.checked)} />
                      <span className="thumb" style={{ background: productLook(p?.group).bg }}><ProductArt group={p?.group} size={34} /></span>
                      <span className="info">
                        <span className="nm">{p?.name ?? tr("(đã xoá)", "(deleted)")}</span>
                        <span className="meta">
                          {L.scope[scope]}{step.n ? ` · ${step.n}` : ""}
                          {p && p.status !== "active" && <span className={`status s-${p.status}`}>{L.status[p.status]}</span>}
                        </span>
                      </span>
                      <span className="tick"><G name="check" size={14} width={3.5} /></span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <p className="foot">{tr("Niks · điều chỉnh theo phản ứng thực tế của da bạn nhé.", "Niks · adjust to how your skin actually responds.")}</p>
    </section>
  );
}

/* ================= CÀI ĐẶT ================= */
function SettingsPanel({ state, mutate }: { state: State; mutate: Mutate }) {
  const { tr, lang, setLang, L } = useI18n();
  return (
    <div className="settings">
      <div className="card">
        <div className="h3">{tr("Ngôn ngữ", "Language")}</div>
        <div className="seg" role="group" aria-label={tr("Ngôn ngữ", "Language")}>
          <button aria-pressed={lang === "vi"} onClick={() => setLang("vi")}>Tiếng Việt</button>
          <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
        </div>
      </div>
      <div className="card">
        <div className="h3">{tr("Chu kỳ 2 tuần", "2-week cycle")}</div>
        <p className="small">{tr("Tuần này đang là", "This week is")} <strong>{L.week[weekOf(new Date(), state.settings.cycleStart)]}</strong>.</p>
        <label className="field">{tr("Ngày bắt đầu chu kỳ", "Cycle start date")}
          <input type="date" value={state.settings.cycleStart}
            onChange={(e) => mutate(tr("chu kỳ", "cycle"), () => api("/api/settings", "PUT", { cycleStart: e.target.value }))} />
        </label>
        <button className="pill soft" onClick={() => {
          const d = parseKey(state.settings.cycleStart); d.setDate(d.getDate() + 7);
          mutate(tr("chu kỳ", "cycle"), () => api("/api/settings", "PUT", { cycleStart: dateKey(d) }));
        }}>{tr("Đổi sang tuần còn lại", "Switch to the other week")}</button>
      </div>
    </div>
  );
}
