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
import { Cat, mascotSays } from "./Mascot";
import { ProfileCard, SkinQuiz, TonightCard } from "./Smart";
import { haptic } from "@/lib/haptics";
import { GOOD_DAY, dayStat } from "@/lib/habits";

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
  const [quiz, setQuiz] = useState(false);
  const [party, setParty] = useState(0);
  const sky = useSky();

  /** Xong một routine: mèo nhảy cổ vũ + rung */
  const celebrate = useCallback(() => {
    haptic("success");
    setParty(Date.now());
  }, []);
  useEffect(() => {
    if (!party) return;
    const t = setTimeout(() => setParty(0), 2600);
    return () => clearTimeout(t);
  }, [party]);

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

  const go = (t: Tab) => { if (t !== tab) haptic(); setTab(t); setNavHidden(false); window.scrollTo({ top: 0 }); };

  if (error && !state) return <div className="boot"><img src="/icons/icon-192.png" alt="" /><p>{tr("Không tải được dữ liệu", "Couldn't load your data")}: {error}</p></div>;
  if (!state) return <div className="boot"><img src="/icons/icon-192.png" alt="" className="pulse" /><p>{tr("Đang tải Niks…", "Loading Niks…")}</p></div>;

  return (
    <div className="app">
      {tab === "progress" ? <div className="pbg" aria-hidden="true" /> : <SkyBackdrop phase={sky.phase} />}
      <main className="views">
        {tab === "today" && (
          <TodayView state={state} setState={setState} mutate={mutate} openSettings={() => setSettings(true)} openQuiz={() => setQuiz(true)} celebrate={celebrate} party={!!party}
            startRoutine={(scope, section) => { setRoutineTarget({ scope, section, nonce: Date.now() }); go("routine"); }}
            pickMood={(k) => { setMoodPick(k); go("mood"); }} goShelf={() => go("shelf")} goProgress={() => go("progress")} />
        )}
        {tab === "routine" && <RoutineView state={state} setState={setState} mutate={mutate} target={routineTarget} toast={setToastMsg} celebrate={celebrate} />}
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
        <SettingsPanel state={state} mutate={mutate} sky={sky} openQuiz={() => { setSettings(false); setQuiz(true); }} />
      </Sheet>

      <Sheet open={quiz} onClose={() => setQuiz(false)} title={tr("Hồ sơ da", "Skin profile")}>
        <SkinQuiz initial={state.settings.skinProfile} mutate={mutate} onDone={() => { setQuiz(false); setToastMsg(tr("Đã lưu hồ sơ da", "Skin profile saved")); }} />
      </Sheet>

      {!!party && (
        <div className="party" key={party} aria-hidden="true">
          {Array.from({ length: 22 }, (_, i) => <i key={i} style={{ ["--i" as any]: i, ["--x" as any]: `${(i * 37) % 100}%` }} />)}
          <div className="party-cat"><Cat mood="cheer" size={150} /></div>
        </div>
      )}

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
function TodayView({ state, setState, mutate, openSettings, openQuiz, celebrate, party, startRoutine, pickMood, goShelf, goProgress }: {
  state: State; setState: (s: State) => void; mutate: Mutate; openSettings: () => void; openQuiz: () => void; celebrate: () => void; party: boolean;
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
  const todayStat = useMemo(() => dayStat(state, dk), [state, dk]);
  const yesterdayMissed = useMemo(() => {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    const s = dayStat(state, dateKey(y));
    return s.planned > 0 && s.ratio < GOOD_DAY;
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const say = mascotSays({ hour: now.getHours(), streak, todayRatio: todayStat.ratio, sectionDone: heroTotal > 0 && heroDone === heroTotal, yesterdayMissed, celebrate: party });
  const [wiggle, setWiggle] = useState(0);

  const expiring = state.products.filter((p) => p.status === "active" && paoInfo(p)?.soon);
  const wish = state.products.filter((p) => p.status === "wish");

  const toggle = (scope: Scope, key: string, pid: string, done: boolean) => {
    const checks = { ...state.checks, [dk]: { ...(state.checks[dk] ?? {}) } };
    if (done) checks[dk][`${scope}:${key}:${pid}`] = true;
    else delete checks[dk][`${scope}:${key}:${pid}`];
    setState({ ...state, checks });
    // xong cả nhóm (sáng / tối / tóc) → ăn mừng
    const grp = TODAY_GROUPS.find((g) => g.parts.some(([s, k]) => s === scope && k === key));
    const all = grp?.parts.flatMap(([s, k]) => (state.routines[s][wk]?.[di]?.sections.find((x) => x.key === k)?.steps ?? []).map((st) => `${s}:${k}:${st.p}`)) ?? [];
    if (done && all.length && all.every((id) => checks[dk][id])) celebrate(); else haptic(done ? "medium" : "light");
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

      <button className={`mascot ${say.mood}`} onClick={() => { haptic(); setWiggle(Date.now()); }} aria-label={lang === "en" ? say.en : say.vi}>
        <span key={wiggle} className={`mascot-cat ${wiggle ? "boop" : ""}`}><Cat mood={say.mood} size={84} /></span>
        <span className="bubble">{lang === "en" ? say.en : say.vi}</span>
      </button>

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

      <TonightCard state={state} mutate={mutate} openRoutine={() => startRoutine("face", "pm")} />

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

      <ProfileCard state={state} openQuiz={openQuiz} />

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
function SettingsPanel({ state, mutate, sky, openQuiz }: { state: State; mutate: Mutate; sky: ReturnType<typeof useSky>; openQuiz: () => void }) {
  const { tr, lang, setLang, L } = useI18n();
  return (
    <div className="settings">
      <div className="card">
        <div className="h3">{tr("Hồ sơ da", "Skin profile")}</div>
        <p className="small">{state.settings.skinProfile ? tr("Cập nhật khi da bạn thay đổi theo mùa.", "Update it when your skin changes with the seasons.") : tr("Trả lời 3 câu để nhận gợi ý riêng.", "Answer 3 questions for tailored suggestions.")}</p>
        <button className="pill soft" onClick={openQuiz}>{state.settings.skinProfile ? tr("Làm lại trắc nghiệm", "Retake the quiz") : tr("Bắt đầu", "Start")}</button>
      </div>
      <div className="card">
        <div className="h3">{tr("Nền theo giờ", "Time-of-day background")}</div>
        <div className="seg" role="group" aria-label={tr("Nền", "Background")}>
          {(["auto", "am", "day", "pm"] as const).map((k) => (
            <button key={k} aria-pressed={sky.pref === k} onClick={() => { haptic(); sky.setPref(k); }}>
              {k === "auto" ? tr("Tự động", "Auto") : k === "am" ? tr("Bình minh", "Sunrise") : k === "day" ? tr("Ban ngày", "Daytime") : tr("Đêm sao", "Starry")}
            </button>
          ))}
        </div>
      </div>
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

/* ================= NỀN THEO GIỜ ================= */
export type SkyPhase = "am" | "day" | "pm";
type SkyPref = SkyPhase | "auto";
const SKY_KEY = "niks-sky";
const phaseAt = (h: number): SkyPhase => (h >= 5 && h < 11 ? "am" : h >= 11 && h < 17 ? "day" : "pm");
const SKY_TOP: Record<SkyPhase, string> = { am: "#FCE1D4", day: "#FFF7E6", pm: "#1E2A3A" };

function useSky() {
  const [pref, setPrefState] = useState<SkyPref>("auto");
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    try {
      const v = new URLSearchParams(location.search).get("sky") ?? localStorage.getItem(SKY_KEY);
      if (v === "am" || v === "day" || v === "pm" || v === "auto") setPrefState(v);
    } catch {}
    const t = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(t);
  }, []);
  const phase = pref === "auto" ? phaseAt(hour) : pref;
  useEffect(() => {
    document.body.dataset.sky = phase;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", SKY_TOP[phase]);
  }, [phase]);
  const setPref = (p: SkyPref) => { setPrefState(p); try { localStorage.setItem(SKY_KEY, p); } catch {} };
  return { pref, setPref, phase };
}

function SkyBackdrop({ phase }: { phase: SkyPhase }) {
  return (
    <div className={`skybg skybg-${phase}`} aria-hidden="true">
      {phase === "am" && <><span className="sun-disc" /><span className="cloud c1" /><span className="cloud c2" /></>}
      {phase === "day" && <><span className="cloud c1" /><span className="cloud c2" /></>}
      {phase === "pm" && <>
        {Array.from({ length: 36 }, (_, i) => (
          <i key={i} className="star" style={{ left: `${(i * 53) % 100}%`, top: `${(i * 29) % 62}%`, ["--tw" as any]: `${2 + (i % 5)}s`, ["--s" as any]: `${1 + (i % 3)}px` }} />
        ))}
        <span className="shoot" />
        <span className="moon-disc" />
        <span className="lagoon" />
      </>}
    </div>
  );
}
