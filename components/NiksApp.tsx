"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import {
  DAY_NAMES, GROUPS, SCOPE_LABEL, SECTION_META, STATUS, STATUS_KEYS, TODAY_GROUPS, WEEK_LABEL,
  type Scope, type ProductStatus,
} from "@/lib/defaults";
import { dateKey, dayIndex, parseKey, weekOf } from "@/lib/dates";

type Product = { id: string; scope: Scope; group: string; name: string; note: string; status: ProductStatus };
type Step = { p: string; n: string };
type Day = { short: string; full: string; focus: string; sections: { key: string; steps: Step[] }[] };
type State = {
  settings: { cycleStart: string; reminderTime: string; reminderEnabled: boolean };
  products: Product[];
  routines: Record<Scope, Record<"A" | "B", Day[]>>;
  journal: Record<string, { acne: number; dark: number; dry: number; sting: number; note: string }>;
  checks: Record<string, Record<string, boolean>>;
};

const METRICS = [
  { key: "acne", label: "Mụn viêm", color: "#c66b7e" },
  { key: "dark", label: "Thâm", color: "#8a6ea8" },
  { key: "dry", label: "Khô / bong", color: "#d9a05b" },
  { key: "sting", label: "Châm chích", color: "#5f9e8f" },
] as const;

const SCOPES: Scope[] = ["face", "hair", "body"];
const THEME: Record<Scope, string> = { face: "", hair: "theme-yellow", body: "theme-almond" };

async function api(path: string, method: string, body?: any) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Lỗi kết nối");
  return res.json();
}

export default function NiksApp() {
  const [state, setState] = useState<State | null>(null);
  const [tab, setTab] = useState<"today" | Scope>("today");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetch("/api/state").then((r) => r.json());
    setState(data);
  }, []);

  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  /** Gửi thay đổi lên server rồi tải lại state. Cập nhật lạc quan ở nơi cần phản hồi tức thì. */
  const mutate = useCallback(async (label: string, fn: () => Promise<any>) => {
    setBusy(label);
    try { await fn(); await refresh(); setError(null); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }, [refresh]);

  if (error && !state) return <div className="wrap"><p className="loading">Không tải được dữ liệu: {error}</p></div>;
  if (!state) return <div className="wrap"><p className="loading">Đang tải Niks…</p></div>;

  return (
    <div className="wrap">
      <div className="intro">
        <div className="brand">
          <img src="/icons/icon-192.png" alt="" />
          <h1>Niks</h1>
        </div>
        <p>Lịch chăm sóc da mặt, tóc và cơ thể theo chu kỳ 2 tuần — kèm nhật ký da và nhắc nhở buổi tối.</p>
      </div>

      <div className="cat-switcher">
        <button className={`cat-btn ${tab === "today" ? "active" : ""}`} data-cat="today" onClick={() => setTab("today")}>
          <span className="ico">📅</span>Hôm nay
        </button>
        <button className={`cat-btn ${tab === "face" ? "active" : ""}`} data-cat="face" onClick={() => setTab("face")}>
          <span className="ico">🌸</span>Da mặt
        </button>
        <button className={`cat-btn ${tab === "hair" ? "active" : ""}`} data-cat="hair" onClick={() => setTab("hair")}>
          <span className="ico">💛</span>Tóc
        </button>
        <button className={`cat-btn ${tab === "body" ? "active" : ""}`} data-cat="body" onClick={() => setTab("body")}>
          <span className="ico">🌰</span>Da cơ thể
        </button>
      </div>

      {tab === "today"
        ? <TodayView state={state} setState={setState} mutate={mutate} />
        : <ScopeView key={tab} scope={tab} state={state} mutate={mutate} />}

      {busy && <div className="saving">Đang lưu {busy}…</div>}
      {error && state && <div className="saving" style={{ color: "#b8536a" }}>{error}</div>}

      <footer>🌷 Niks — điều chỉnh theo phản ứng thực tế của da bạn nhé.</footer>
    </div>
  );
}

/* ================= HÔM NAY ================= */
function TodayView({ state, setState, mutate }: { state: State; setState: (s: State) => void; mutate: any }) {
  const now = new Date();
  const dk = dateKey(now);
  const wk = weekOf(now, state.settings.cycleStart);
  const di = dayIndex(now);
  const faceDay = state.routines.face[wk]?.[di];

  const stats = useMemo(() => {
    let total = 0, done = 0;
    for (const g of TODAY_GROUPS) for (const [scope, key] of g.parts) {
      const sec = state.routines[scope][wk]?.[di]?.sections.find((s) => s.key === key);
      for (const st of sec?.steps ?? []) { total++; if (state.checks[dk]?.[`${scope}:${key}:${st.p}`]) done++; }
    }
    return { total, done };
  }, [state, wk, di, dk]);

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

  const toggle = (scope: Scope, key: string, pid: string, done: boolean) => {
    // cập nhật ngay trên màn hình, gửi server nền
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
    <section className="category active">
      <header className="hero">
        <p className="eyebrow">Hôm nay</p>
        <h1 className="cat-title">{DAY_NAMES[di]}, {now.getDate()}/{now.getMonth() + 1}</h1>
        <p className="desc">{WEEK_LABEL[wk]} của chu kỳ · trọng tâm da mặt hôm nay: {faceDay?.focus ?? "—"}.</p>
        <div className="today-meta">
          <div className="meta-card"><span className="k">Tiến độ hôm nay</span><span className="v">{stats.done}/{stats.total}</span></div>
          <div className="meta-card"><span className="k">Chuỗi ngày</span><span className="v">{streak} ngày</span></div>
          <div className="meta-card"><span className="k">Tuần</span><span className="v">{wk}</span></div>
        </div>
      </header>

      {TODAY_GROUPS.map((g) => {
        const rows: { scope: Scope; key: string; step: Step }[] = [];
        for (const [scope, key] of g.parts) {
          const sec = state.routines[scope][wk]?.[di]?.sections.find((s) => s.key === key);
          for (const step of sec?.steps ?? []) rows.push({ scope, key, step });
        }
        if (!rows.length) return null;
        const done = rows.filter((r) => state.checks[dk]?.[`${r.scope}:${r.key}:${r.step.p}`]).length;
        return (
          <div className={`card ${g.tone}`} key={g.title}>
            <div className="card-head">
              <Icon />
              <div><p className="card-title">{g.title}</p><p className="card-sub">{g.sub}</p></div>
              <div className="head-right">
                <span className="pct">{done}/{rows.length}</span>
                <div className="progress"><i style={{ width: `${Math.round((done / rows.length) * 100)}%` }} /></div>
              </div>
            </div>
            <ul className="steps">
              {rows.map(({ scope, key, step }) => {
                const on = !!state.checks[dk]?.[`${scope}:${key}:${step.p}`];
                const p = byId[step.p];
                return (
                  <li className={`check-row ${on ? "done" : ""}`} key={`${scope}-${key}-${step.p}`}>
                    <input className="tickbox" type="checkbox" checked={on}
                      onChange={(e) => toggle(scope, key, step.p, e.target.checked)} />
                    <div className="icon-badge"><Icon group={p?.group} /></div>
                    <div className="step-body">
                      <strong>
                        {p?.name ?? "(đã xoá)"}
                        <span className="step-tag">{SCOPE_LABEL[scope]}</span>
                        {p && p.status !== "active" && <span className={`status-pill s-${p.status}`}>{STATUS[p.status]}</span>}
                      </strong>
                      {step.n && <span className="note">{step.n}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <JournalPanel state={state} mutate={mutate} />
      <SettingsPanel state={state} mutate={mutate} />
    </section>
  );
}

/* ================= NHẬT KÝ ================= */
function JournalPanel({ state, mutate }: { state: State; mutate: any }) {
  const [date, setDate] = useState(dateKey());
  const entry = state.journal[date] ?? { acne: 2, dark: 2, dry: 2, sting: 1, note: "" };
  const [draft, setDraft] = useState(entry);
  const lastDate = useRef(date);

  useEffect(() => {
    if (lastDate.current !== date) { lastDate.current = date; setDraft(state.journal[date] ?? { acne: 2, dark: 2, dry: 2, sting: 1, note: "" }); }
  }, [date, state.journal]);

  const keys = Object.keys(state.journal).sort();
  const entries = keys.slice(-30).map((k) => ({ k, ...state.journal[k] }));

  const save = () => mutate("nhật ký", () => api("/api/journal", "PUT", { date, ...draft }));
  const remove = (d: string) => {
    if (!confirm("Xoá ghi chép ngày này?")) return;
    mutate("nhật ký", () => api(`/api/journal?date=${d}`, "DELETE"));
  };

  return (
    <>
      <h2 className="section-title">Nhật ký da</h2>
      <p className="section-lead">
        Mỗi tối chấm 1–5 cho bốn dấu hiệu: 1 là ổn nhất, 5 là nặng nhất. Ghi đều trong 8–12 tuần đầu dùng Differin
        sẽ thấy rõ đâu là đẩy mụn (nặng rồi dịu lại) và đâu là kích ứng (tăng dần, kèm châm chích).
      </p>

      <div className="journal">
        {METRICS.map((m) => (
          <div className="row" key={m.key}>
            <label htmlFor={`j-${m.key}`}>{m.label}</label>
            <input id={`j-${m.key}`} type="range" min={1} max={5} step={1}
              value={(draft as any)[m.key]}
              style={{ ["--pct" as any]: `${(((draft as any)[m.key] - 1) / 4) * 100}%` }}
              onChange={(e) => setDraft({ ...draft, [m.key]: +e.target.value })} />
            <span className="val">{(draft as any)[m.key]}/5</span>
          </div>
        ))}
        <textarea value={draft.note} placeholder="Ghi chú ngắn: đổi sản phẩm gì, da có gì lạ…"
          onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        <div className="jfoot">
          <input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} />
          <button className="btn primary" onClick={save}>Lưu nhật ký</button>
          {state.journal[date] && <span className="saved">Đã có ghi chép cho ngày này</span>}
          {state.journal[date] && <button className="btn" onClick={() => remove(date)}>Xoá ghi chép</button>}
        </div>
      </div>

      <JournalChart entries={entries} />

      <details className="cab">
        <summary><span>Lịch sử nhật ký</span><span className="cab-count">{keys.length} ngày</span></summary>
        <div className="cab-body">
          {keys.length === 0 && <div className="empty">Chưa có ghi chép nào.</div>}
          {[...keys].reverse().map((k) => {
            const e = state.journal[k], d = parseKey(k);
            return (
              <div className="jrow" key={k}>
                <span className="jdate">{d.getDate()}/{d.getMonth() + 1}</span>
                <span className="jscores">
                  {METRICS.map((m) => (
                    <span className="jscore" key={m.key} style={{ background: m.color }} title={m.label}>
                      {m.label.split(" ")[0]} {(e as any)[m.key]}
                    </span>
                  ))}
                </span>
                <span className="jnote">{e.note || "—"}</span>
                <span className="jacts">
                  <button className="icon-btn" title="Mở lại để sửa" onClick={() => setDate(k)}>✎</button>
                  <button className="icon-btn" title="Xoá ngày này" onClick={() => remove(k)}>✕</button>
                </span>
              </div>
            );
          })}
        </div>
      </details>
    </>
  );
}

function JournalChart({ entries }: { entries: any[] }) {
  if (entries.length < 2) return <div className="empty">Cần ít nhất 2 ngày ghi nhật ký để vẽ biểu đồ xu hướng.</div>;
  const W = 640, H = 230, padL = 30, padR = 14, padT = 14, padB = 34;
  const x = (i: number) => padL + (entries.length === 1 ? 0 : (i * (W - padL - padR)) / (entries.length - 1));
  const y = (v: number) => padT + ((5 - v) / 4) * (H - padT - padB);
  const fmt = (k: string) => { const d = parseKey(k); return `${d.getDate()}/${d.getMonth() + 1}`; };
  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        {METRICS.map((m) => <span key={m.key}><span className="dot" style={{ background: m.color }} />{m.label}</span>)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ nhật ký da">
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="#f0dde1" strokeWidth={1} />
            <text x={6} y={y(v) + 4} fontSize={11} fill="#b09aa0" fontFamily="Nunito">{v}</text>
          </g>
        ))}
        {METRICS.map((m) => (
          <g key={m.key}>
            <polyline fill="none" stroke={m.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
              points={entries.map((e, i) => `${x(i)},${y(e[m.key] || 1)}`).join(" ")} />
            {entries.map((e, i) => <circle key={i} cx={x(i)} cy={y(e[m.key] || 1)} r={2.6} fill={m.color} />)}
          </g>
        ))}
        <text x={padL} y={H - 10} fontSize={11} fill="#b09aa0" fontFamily="Nunito">{fmt(entries[0].k)}</text>
        <text x={W - padR} y={H - 10} fontSize={11} fill="#b09aa0" textAnchor="end" fontFamily="Nunito">{fmt(entries[entries.length - 1].k)}</text>
      </svg>
      <p style={{ fontSize: 12, color: "#a8938c", margin: "10px 0 0", fontWeight: 600 }}>
        1 = ổn nhất · 5 = nặng nhất · {entries.length} ngày gần nhất có ghi chép
      </p>
    </div>
  );
}

/* ================= CÀI ĐẶT & NHẮC NHỞ ================= */
function SettingsPanel({ state, mutate }: { state: State; mutate: any }) {
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
    <>
      <h2 className="section-title">Chu kỳ &amp; nhắc nhở</h2>
      <div className="settings-grid">
        <div className="setting-card">
          <h3>Chu kỳ 2 tuần</h3>
          <p>Tuần này đang là <strong>{WEEK_LABEL[weekOf(new Date(), state.settings.cycleStart)]}</strong>.</p>
          <input type="date" value={state.settings.cycleStart}
            onChange={(e) => mutate("chu kỳ", () => api("/api/settings", "PUT", { cycleStart: e.target.value }))} />
          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => {
              const d = parseKey(state.settings.cycleStart); d.setDate(d.getDate() + 7);
              mutate("chu kỳ", () => api("/api/settings", "PUT", { cycleStart: dateKey(d) }));
            }}>Đổi sang tuần còn lại</button>
          </div>
        </div>

        <div className="setting-card">
          <h3>Nhắc nhở buổi tối</h3>
          <p>
            Niks sẽ nhắc nếu tới giờ mà buổi tối còn bước chưa tick.
            {!standalone && " Trên iPhone, hãy thêm app vào màn hình chính rồi mở từ đó."}
          </p>
          <label className="switch">
            <input type="time" value={state.settings.reminderTime}
              onChange={(e) => mutate("giờ nhắc", () => api("/api/settings", "PUT", { reminderTime: e.target.value }))} />
          </label>
          <button className="btn primary" onClick={enablePush}>
            {perm === "granted" && state.settings.reminderEnabled ? "Bật lại trên thiết bị này" : "Bật thông báo"}
          </button>
          {state.settings.reminderEnabled && (
            <button className="btn" style={{ marginLeft: 8 }}
              onClick={() => mutate("nhắc nhở", () => api("/api/settings", "PUT", { reminderEnabled: false }))}>
              Tắt nhắc nhở
            </button>
          )}
          {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
        </div>
      </div>
    </>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/* ================= LỊCH THEO MỤC ================= */
function ScopeView({ scope, state, mutate }: { scope: Scope; state: State; mutate: any }) {
  const [week, setWeek] = useState<"A" | "B">("A");
  const [day, setDay] = useState(0);
  const [editing, setEditing] = useState(false);
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState<"all" | ProductStatus>("active");
  const [dragFrom, setDragFrom] = useState<{ sec: number; idx: number } | null>(null);

  const days = state.routines[scope][week];
  const current = days[day];
  const products = state.products.filter((p) => p.scope === scope);
  const byId = Object.fromEntries(state.products.map((p) => [p.id, p]));
  const groups = [...GROUPS[scope], ...new Set(products.map((p) => p.group).filter((g) => !GROUPS[scope].includes(g)))];
  const byStatus = status === "all" ? products : products.filter((p) => p.status === status);
  const shown = group === "all" ? byStatus : byStatus.filter((p) => p.group === group);

  const putSection = (secIdx: number, steps: Step[]) =>
    mutate("lịch", () => api("/api/routine/section", "PUT", {
      scope, week, dayIndex: day, key: current.sections[secIdx].key, steps,
    }));

  const addStep = (secIdx: number, pid: string) => {
    const p = byId[pid];
    putSection(secIdx, [...current.sections[secIdx].steps, { p: pid, n: p?.note ?? "" }]);
  };
  const removeStep = (secIdx: number, idx: number) =>
    putSection(secIdx, current.sections[secIdx].steps.filter((_, i) => i !== idx));
  const reorder = (secIdx: number, from: number, to: number) => {
    const steps = [...current.sections[secIdx].steps];
    const [moved] = steps.splice(from, 1);
    steps.splice(to, 0, moved);
    putSection(secIdx, steps);
  };
  const editNote = (secIdx: number, idx: number) => {
    const step = current.sections[secIdx].steps[idx];
    const n = prompt("Ghi chú cho bước này:", step.n);
    if (n === null) return;
    putSection(secIdx, current.sections[secIdx].steps.map((s, i) => (i === idx ? { ...s, n } : s)));
  };

  const usage = (pid: string) => {
    let n = 0;
    for (const w of ["A", "B"] as const)
      for (const d of state.routines[scope][w])
        for (const sec of d.sections) for (const st of sec.steps) if (st.p === pid) n++;
    return n;
  };

  return (
    <section className={`category active ${THEME[scope]}`}>
      <header className="hero">
        <p className="eyebrow">{SCOPE_LABEL[scope]}</p>
        <h1 className="cat-title">Lịch {WEEK_LABEL[week].toLowerCase()}</h1>
        <p className="desc">Bật “Chỉnh lịch” để kéo thả đổi thứ tự, sửa ghi chú, bỏ bước hoặc thêm sản phẩm từ tủ.</p>
      </header>

      <div className="week-switch">
        <span className="label">Chu kỳ 2 tuần:</span>
        {(["A", "B"] as const).map((w) => (
          <button key={w} className={`btn ${week === w ? "primary" : ""}`} onClick={() => setWeek(w)}>{WEEK_LABEL[w]}</button>
        ))}
      </div>
      <div className="toolbar">
        <button className={`btn ${editing ? "primary" : ""}`} onClick={() => setEditing(!editing)}>
          {editing ? "✓ Xong" : "✎ Chỉnh lịch"}
        </button>
        <button className="btn" onClick={() => {
          if (!confirm(`Chép toàn bộ lịch ${WEEK_LABEL[week]} đè lên tuần còn lại?`)) return;
          mutate("lịch", () => api("/api/routine/copy", "POST", { scope, from: week, to: week === "A" ? "B" : "A" }));
        }}>⧉ Chép lịch sang tuần còn lại</button>
      </div>

      <div className="tabs">
        {days.map((d, i) => (
          <button key={i} className={`tab ${i === day ? "active" : ""}`} onClick={() => setDay(i)}>
            {d.short}<span className="d">{d.full.split(" ").pop()}</span>
          </button>
        ))}
      </div>

      <div className={editing ? "editing" : ""}>
        <div className="badge-row">
          <span className="badge focus">{current.full} · {WEEK_LABEL[week]}</span>
          <button className="badge edit-focus" onClick={() => {
            if (!editing) return;
            const focus = prompt("Trọng tâm của ngày:", current.focus);
            if (focus === null) return;
            mutate("lịch", () => api("/api/routine/day", "PATCH", { scope, week, dayIndex: day, focus }));
          }}>Trọng tâm: {current.focus}{editing ? " ✎" : ""}</button>
        </div>

        {current.sections.map((sec, secIdx) => {
          const meta = SECTION_META[scope][sec.key] ?? { title: sec.key, sub: "", tone: "am" as const };
          return (
            <div className={`card ${meta.tone}`} key={sec.key}>
              <div className="card-head">
                <Icon />
                <div><p className="card-title">{meta.title}</p><p className="card-sub">{meta.sub}</p></div>
              </div>
              <ul className="steps">
                {sec.steps.length === 0 && <li><div className="step-body"><span className="note">Chưa có bước nào.</span></div></li>}
                {sec.steps.map((st, idx) => {
                  const p = byId[st.p];
                  return (
                    <li key={`${st.p}-${idx}`} draggable={editing}
                      onDragStart={() => setDragFrom({ sec: secIdx, idx })}
                      onDragOver={(e) => { if (dragFrom?.sec === secIdx) e.preventDefault(); }}
                      onDrop={(e) => {
                        if (dragFrom?.sec !== secIdx) return;
                        e.preventDefault(); reorder(secIdx, dragFrom.idx, idx); setDragFrom(null);
                      }}>
                      <span className="handle">☰</span>
                      <div className="icon-badge"><Icon group={p?.group} /></div>
                      <div className="step-body">
                        <strong>
                          {p?.name ?? "(sản phẩm đã xoá)"}
                          {p && p.status !== "active" && <span className={`status-pill s-${p.status}`}>{STATUS[p.status]}</span>}
                        </strong>
                        {st.n && <span className="note">{st.n}</span>}
                      </div>
                      <div className="step-acts">
                        <button className="icon-btn" title="Sửa ghi chú" onClick={() => editNote(secIdx, idx)}>✎</button>
                        <button className="icon-btn" title="Bỏ bước" onClick={() => removeStep(secIdx, idx)}>✕</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="add-step">
                <select id={`add-${scope}-${secIdx}`} defaultValue={products[0]?.id}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.group} — {p.name}{p.status !== "active" ? ` (${STATUS[p.status]})` : ""}
                    </option>
                  ))}
                </select>
                <button className="btn" onClick={() => {
                  const sel = document.getElementById(`add-${scope}-${secIdx}`) as HTMLSelectElement;
                  if (sel?.value) addStep(secIdx, sel.value);
                }}>+ Thêm vào {meta.title.toLowerCase()}</button>
              </div>
            </div>
          );
        })}
      </div>

      <details className="cab">
        <summary>
          <span>Tủ sản phẩm</span>
          <span className="cab-count">{products.filter((p) => p.status === "active").length} đang dùng · {products.length} món</span>
        </summary>
        <div className="cab-body">
          <div className="toolbar">
            <button className="btn primary" onClick={() => {
              const name = prompt("Tên sản phẩm:");
              if (!name) return;
              const g = prompt(`Nhóm (${groups.join(" / ")}):`, groups[0]) || groups[0];
              const note = prompt("Ghi chú (có thể bỏ trống):", "") ?? "";
              mutate("tủ", () => api("/api/products", "POST", { scope, group: g, name, note, status: "active" }));
            }}>+ Thêm sản phẩm</button>
          </div>

          <div className="filter-row">
            <span className="filter-label">Trạng thái</span>
            <div className="segmented">
              <button className={`chip ${status === "all" ? "active" : ""}`} onClick={() => { setStatus("all"); setGroup("all"); }}>
                Tất cả trạng thái <span className="count">{products.length}</span>
              </button>
              {STATUS_KEYS.map((k) => (
                <button key={k} className={`chip ${status === k ? "active" : ""}`} onClick={() => { setStatus(k); setGroup("all"); }}>
                  {STATUS[k]} <span className="count">{products.filter((p) => p.status === k).length}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="filter-label">Nhóm sản phẩm</span>
            <div className="chips">
              <button className={`chip ${group === "all" ? "active" : ""}`} onClick={() => setGroup("all")}>
                Tất cả nhóm <span className="count">{byStatus.length}</span>
              </button>
              {groups.map((g) => (
                <button key={g} className={`chip ${group === g ? "active" : ""}`} onClick={() => setGroup(g)}>
                  {g} <span className="count">{byStatus.filter((p) => p.group === g).length}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="gallery">
            {shown.length === 0 && <div className="empty">Chưa có sản phẩm nào trong nhóm này.</div>}
            {shown.map((p) => (
              <div className={`prod is-${p.status}`} key={p.id}>
                <Icon group={p.group} size={34} />
                <span className="pname">{p.name}</span>
                <span className="pcat">{p.group}</span>
                {p.status !== "active" && <span className={`status-pill s-${p.status}`}>{STATUS[p.status]}</span>}
                {p.note && <span className="pnote">{p.note}</span>}
                <div className="pacts" style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button className="icon-btn" title="Đổi trạng thái" onClick={() => {
                    const next = STATUS_KEYS[(STATUS_KEYS.indexOf(p.status) + 1) % STATUS_KEYS.length];
                    mutate("tủ", () => api(`/api/products/${p.id}`, "PATCH", { status: next }));
                  }}>⟳</button>
                  <button className="icon-btn" title="Sửa" onClick={() => {
                    const name = prompt("Tên sản phẩm:", p.name); if (name === null) return;
                    const note = prompt("Ghi chú:", p.note) ?? p.note;
                    mutate("tủ", () => api(`/api/products/${p.id}`, "PATCH", { name, note }));
                  }}>✎</button>
                  <button className="icon-btn" title="Xoá" onClick={() => {
                    const used = usage(p.id);
                    if (!confirm(used ? `Xoá “${p.name}”? Sản phẩm đang nằm trong ${used} bước và sẽ bị gỡ khỏi lịch.` : `Xoá “${p.name}”?`)) return;
                    mutate("tủ", () => api(`/api/products/${p.id}`, "DELETE"));
                  }}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="freq">
            <h4>Ước lượng tần suất</h4>
            <p className="hint">Đếm số lần mỗi sản phẩm xuất hiện trong trọn chu kỳ 2 tuần của lịch hiện tại.</p>
            {products.map((p) => ({ p, n: usage(p.id) })).sort((a, b) => b.n - a.n || a.p.name.localeCompare(b.p.name))
              .map(({ p, n }) => {
                const max = Math.max(1, ...products.map((x) => usage(x.id)));
                const per = n / 2;
                return (
                  <div className={`freq-row ${n ? "" : "zero"}`} key={p.id}>
                    <span className="fname">{p.name}</span>
                    <span className="fbar"><i style={{ width: `${Math.round((n / max) * 100)}%` }} /></span>
                    <span className="fcount">
                      {n ? `${n} lần / 2 tuần · ${String(per).replace(".", ",")} lần/tuần` : "chưa có trong lịch"}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </details>
    </section>
  );
}
