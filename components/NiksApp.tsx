"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DAY_NAMES, SCOPE_LABEL, STATUS, TODAY_GROUPS, WEEK_LABEL, type Scope } from "@/lib/defaults";
import { dateKey, dayIndex, parseKey, weekOf } from "@/lib/dates";
import { QUICK_MOODS, MOOD_BY_KEY } from "@/lib/moods";
import type { Mutate, State, Step } from "@/lib/types";
import { G, MoodBlob, ProductArt, productLook } from "./art";
import { Ring, Sheet, api } from "./ui";
import RoutineView from "./RoutineView";
import ShelfView, { paoInfo } from "./ShelfView";
import MoodView from "./MoodView";

/** Tên người dùng hiển thị — sẽ lấy từ tài khoản khi có chức năng đăng nhập */
const USER_NAME = "Kaylie";

type Tab = "today" | "routine" | "shelf" | "mood";
export type RoutineTarget = { scope: Scope; section: string; nonce: number };

export default function NiksApp() {
  const [state, setState] = useState<State | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [quick, setQuick] = useState(false);
  const [settings, setSettings] = useState(false);
  const [routineTarget, setRoutineTarget] = useState<RoutineTarget | null>(null);
  const [moodPick, setMoodPick] = useState<string | null>(null);
  const [shelfAdd, setShelfAdd] = useState(0);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/state");
    if (!res.ok) throw new Error("Không tải được dữ liệu");
    setState(await res.json());
  }, []);

  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  /** Gửi thay đổi lên server rồi tải lại state. */
  const mutate: Mutate = useCallback(async (label, fn) => {
    setBusy(label);
    try { await fn(); await refresh(); setError(null); return true; }
    catch (e: any) { setError(e.message); return false; }
    finally { setBusy(null); }
  }, [refresh]);

  const go = (t: Tab) => {
    setQuick(false);
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  if (error && !state) return <div className="boot"><img src="/icons/icon-192.png" alt="" /><p>Không tải được dữ liệu: {error}</p></div>;
  if (!state) return <div className="boot"><img src="/icons/icon-192.png" alt="" className="pulse" /><p>Đang tải Niks…</p></div>;

  return (
    <div className="app">
      <main className="views">
        {tab === "today" && (
          <TodayView state={state} setState={setState} openSettings={() => setSettings(true)}
            startRoutine={(scope, section) => { setRoutineTarget({ scope, section, nonce: Date.now() }); go("routine"); }}
            pickMood={(k) => { setMoodPick(k); go("mood"); }} goShelf={() => go("shelf")} />
        )}
        {tab === "routine" && <RoutineView state={state} setState={setState} mutate={mutate} target={routineTarget} toast={setToastMsg} />}
        {tab === "shelf" && <ShelfView state={state} mutate={mutate} addSignal={shelfAdd} toast={setToastMsg} />}
        {tab === "mood" && <MoodView state={state} mutate={mutate} preselect={moodPick} clearPreselect={() => setMoodPick(null)} toast={setToastMsg} />}
      </main>

      <nav className="tabbar" aria-label="Điều hướng chính">
        <TabBtn on={tab === "today"} label="Hôm nay" icon="home" onClick={() => go("today")} />
        <TabBtn on={tab === "routine"} label="Lịch trình" icon="routine" onClick={() => go("routine")} />
        <button className={`fab ${quick ? "open" : ""}`} aria-label="Thêm nhanh" onClick={() => setQuick(!quick)}>
          <G name="plus" size={26} width={2.6} />
        </button>
        <TabBtn on={tab === "shelf"} label="Tủ đồ" icon="shelf" onClick={() => go("shelf")} />
        <TabBtn on={tab === "mood"} label="Cảm xúc" icon="mood" onClick={() => go("mood")} />
      </nav>

      <Sheet open={quick} onClose={() => setQuick(false)} title="Thêm nhanh">
        <div className="menu">
          <button onClick={() => { setMoodPick(null); go("mood"); }}>
            <span className="mi" style={{ background: "var(--blush-2)" }}><MoodBlob mood="happy" size={34} /></span>
            <span>Ghi cảm xúc hôm nay<small>Chỉ mất vài giây</small></span>
          </button>
          <button onClick={() => { go("shelf"); setShelfAdd(Date.now()); }}>
            <span className="mi" style={{ background: "var(--sky-2)" }}><ProductArt group="Sữa rửa mặt" size={34} /></span>
            <span>Thêm sản phẩm<small>Cho vào tủ đồ, rồi xếp vào lịch</small></span>
          </button>
        </div>
      </Sheet>

      <Sheet open={settings} onClose={() => setSettings(false)} title="Chu kỳ & nhắc nhở">
        <SettingsPanel state={state} mutate={mutate} />
      </Sheet>

      <div className={`toast ${toastMsg ? "on" : ""}`} role="status">{toastMsg}</div>
      {busy && <div className="saving">Đang lưu {busy}…</div>}
      {error && <div className="saving err">{error}</div>}
    </div>
  );
}

function TabBtn({ on, label, icon, onClick }: { on: boolean; label: string; icon: "home" | "routine" | "shelf" | "mood"; onClick: () => void }) {
  return (
    <button className="tab" aria-current={on ? "page" : undefined} onClick={onClick}>
      <G name={icon} />{label}
    </button>
  );
}

/* ================= HÔM NAY ================= */
function TodayView({ state, setState, openSettings, startRoutine, pickMood, goShelf }: {
  state: State; setState: (s: State) => void; openSettings: () => void;
  startRoutine: (scope: Scope, section: string) => void; pickMood: (k: string) => void; goShelf: () => void;
}) {
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

  const streak = useMemo(() => {
    const ratio = (key: string) => {
      const d = parseKey(key); const w = weekOf(d, state.settings.cycleStart); const i = dayIndex(d);
      let t = 0, c = 0;
      for (const g of TODAY_GROUPS) for (const [scope, sk] of g.parts) {
        const sec = state.routines[scope][w]?.[i]?.sections.find((s) => s.key === sk);
        for (const st of sec?.steps ?? []) { t++; if (state.checks[key]?.[`${scope}:${sk}:${st.p}`]) c++; }
      }
      return t ? c / t : 0;
    };
    const d = new Date();
    if (ratio(dateKey(d)) < 0.8) d.setDate(d.getDate() - 1);
    let n = 0;
    for (let i = 0; i < 400; i++) {
      if (ratio(dateKey(d)) >= 0.8) { n++; d.setDate(d.getDate() - 1); } else break;
    }
    return n;
  }, [state]);

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
          <div className="sub">{DAY_NAMES[di]}, {now.getDate()} tháng {now.getMonth() + 1}</div>
          <h1>Hi {USER_NAME}</h1>
        </div>
        <button className="iconbtn" aria-label="Chu kỳ & nhắc nhở" onClick={openSettings}><G name="gear" size={20} /></button>
      </div>

      <div className="hero">
        <span className="chip glass">{WEEK_LABEL[wk]} · {faceDay?.focus || "Ngày thường"}</span>
        <h2>Routine {tod === "am" ? "buổi sáng" : "buổi tối"}</h2>
        <p>{heroTotal ? `${heroTotal} bước · đã xong ${heroDone}` : "Hôm nay không có bước nào."}</p>
        <button className="pill" onClick={() => startRoutine("face", tod)}>
          {heroDone && heroDone < heroTotal ? "Làm tiếp" : "Bắt đầu"} <G name="arrow" size={16} width={2.5} />
        </button>
        <img className="moon" src="/icons/icon-512.png" alt="" />
        <div className="hero-ring"><Ring value={heroTotal ? heroDone / heroTotal : 0} /></div>
      </div>

      <div className="card">
        <div className="label">Check-in mỗi ngày</div>
        <div className="h3">{todayMood ? `Hôm nay bạn thấy ${MOOD_BY_KEY[todayMood.mood]?.name.toLowerCase()}` : "Hôm nay bạn thấy thế nào?"}</div>
        <div className="quickmood">
          {QUICK_MOODS.map((k) => (
            <button key={k} onClick={() => pickMood(k)} aria-pressed={todayMood?.mood === k}>
              <MoodBlob mood={k} size={44} />{MOOD_BY_KEY[k].name}
            </button>
          ))}
        </div>
      </div>

      <div className="twocol">
        <div className="mini sky">
          <div className="label">Chuỗi ngày</div>
          <div className="big">{streak} ngày</div>
          <div className="small">Hoàn thành từ 80% các bước mỗi ngày</div>
        </div>
        <button className="mini blush" onClick={goShelf}>
          <div className="label">{expiring.length ? "Sắp hết hạn" : "Muốn mua"}</div>
          <div className="big">{expiring.length || wish.length} món</div>
          <div className="small">{expiring.length ? expiring.map((p) => p.name).slice(0, 2).join(", ") : "Mở tủ đồ để xem"}</div>
        </button>
      </div>

      {TODAY_GROUPS.map((g) => {
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
              <div className="grow"><div className="h3">{g.title}</div><div className="small">{g.sub}</div></div>
              <span className="count">{done}/{rows.length}</span>
              <button className="pill soft sm" onClick={() => startRoutine(s0, k0)}>Xem minh hoạ</button>
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
                        <span className="nm">{p?.name ?? "(đã xoá)"}</span>
                        <span className="meta">
                          {SCOPE_LABEL[scope]}{step.n ? ` · ${step.n}` : ""}
                          {p && p.status !== "active" && <span className={`status s-${p.status}`}>{STATUS[p.status]}</span>}
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

      <p className="foot">Niks · điều chỉnh theo phản ứng thực tế của da bạn nhé.</p>
    </section>
  );
}

/* ================= CÀI ĐẶT & NHẮC NHỞ ================= */
function SettingsPanel({ state, mutate }: { state: State; mutate: Mutate }) {
  const [perm, setPerm] = useState<string>(typeof Notification !== "undefined" ? Notification.permission : "default");
  const [msg, setMsg] = useState("");
  const standalone = typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone);

  const enablePush = async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMsg("Trình duyệt này không hỗ trợ thông báo đẩy."); return;
      }
      if (!standalone && /iPhone|iPad/.test(navigator.userAgent)) {
        setMsg("Trên iPhone cần thêm Niks vào màn hình chính rồi mở từ đó mới bật được thông báo."); return;
      }
      const permission = await Notification.requestPermission();
      setPerm(permission);
      if (permission !== "granted") { setMsg("Bạn đã từ chối quyền thông báo."); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      await api("/api/push/subscribe", "POST", { subscription: sub.toJSON(), label: navigator.userAgent.slice(0, 60) });
      await api("/api/settings", "PUT", { reminderEnabled: true });
      setMsg("Đã bật nhắc nhở trên thiết bị này.");
    } catch (e: any) { setMsg("Không bật được: " + e.message); }
  };

  return (
    <div className="settings">
      <div className="card">
        <div className="h3">Chu kỳ 2 tuần</div>
        <p className="small">Tuần này đang là <strong>{WEEK_LABEL[weekOf(new Date(), state.settings.cycleStart)]}</strong>.</p>
        <label className="field">Ngày bắt đầu chu kỳ
          <input type="date" value={state.settings.cycleStart}
            onChange={(e) => mutate("chu kỳ", () => api("/api/settings", "PUT", { cycleStart: e.target.value }))} />
        </label>
        <button className="pill soft" onClick={() => {
          const d = parseKey(state.settings.cycleStart); d.setDate(d.getDate() + 7);
          mutate("chu kỳ", () => api("/api/settings", "PUT", { cycleStart: dateKey(d) }));
        }}>Đổi sang tuần còn lại</button>
      </div>
      <div className="card">
        <div className="h3">Nhắc nhở buổi tối</div>
        <p className="small">
          Niks sẽ nhắc nếu tới giờ mà buổi tối còn bước chưa tick.
          {!standalone && " Trên iPhone, hãy thêm app vào màn hình chính rồi mở từ đó."}
        </p>
        <label className="field">Giờ nhắc
          <input type="time" value={state.settings.reminderTime}
            onChange={(e) => mutate("giờ nhắc", () => api("/api/settings", "PUT", { reminderTime: e.target.value }))} />
        </label>
        <div className="row-btns">
          <button className="pill" onClick={enablePush}>
            {perm === "granted" && state.settings.reminderEnabled ? "Bật lại trên thiết bị này" : "Bật thông báo"}
          </button>
          {state.settings.reminderEnabled && (
            <button className="pill soft" onClick={() => mutate("nhắc nhở", () => api("/api/settings", "PUT", { reminderEnabled: false }))}>
              Tắt nhắc nhở
            </button>
          )}
        </div>
        {msg && <p className="small">{msg}</p>}
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
