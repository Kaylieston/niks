"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { DAY_NAMES, GROUP_ICON, SCOPE_LABEL, SECTION_META, STATUS, WEEK_LABEL, type Scope } from "@/lib/defaults";
import { dateKey, dayIndex, parseKey, weekOf } from "@/lib/dates";
import type { Mutate, Product, State, Step } from "@/lib/types";
import { G, ProductArt, productLook } from "./art";
import { api } from "./ui";
import type { RoutineTarget } from "./NiksApp";

const SCOPES: Scope[] = ["face", "hair", "body"];
/** Sản phẩm rửa trôi — không để lại lớp trên da */
const RINSE = new Set(["micellar", "cleanser", "exfoliant", "water", "mask"]);
const PLAY_MS = 2800;

export default function RoutineView({ state, setState, mutate, target, toast }: {
  state: State; setState: (s: State) => void; mutate: Mutate; target: RoutineTarget | null; toast: (m: string) => void;
}) {
  const today = new Date();
  const [scope, setScope] = useState<Scope>(target?.scope ?? "face");
  const [date, setDate] = useState(dateKey(today));
  const [section, setSection] = useState(target?.section ?? (today.getHours() < 12 ? "am" : "pm"));
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"steps" | "flow">("steps");
  const pending = useRef<number | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const follow = useRef(false);

  useEffect(() => {
    if (!target) return;
    setScope(target.scope); setSection(target.section); setDate(dateKey()); setStep(0); setEditing(false);
  }, [target]);

  const d = parseKey(date);
  const wk = weekOf(d, state.settings.cycleStart);
  const di = dayIndex(d);
  const day = state.routines[scope][wk]?.[di];
  const sectionKeys = Object.keys(SECTION_META[scope]);
  const secKey = sectionKeys.includes(section) ? section : sectionKeys[0];
  const steps: Step[] = day?.sections.find((s) => s.key === secKey)?.steps ?? [];
  const byId = useMemo(() => Object.fromEntries(state.products.map((p) => [p.id, p])), [state.products]);
  const cur = Math.min(step, Math.max(0, steps.length - 1));
  const curStep = steps[cur];
  const curProd: Product | undefined = curStep ? byId[curStep.p] : undefined;

  // tuần hiện tại (T2 → CN) chứa ngày đang chọn
  const weekDates = useMemo(() => {
    const mon = parseKey(date); mon.setDate(mon.getDate() - dayIndex(mon));
    return Array.from({ length: 7 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return x; });
  }, [date]);

  const isDone = (pid: string) => !!state.checks[date]?.[`${scope}:${secKey}:${pid}`];
  const setDone = (pid: string, done: boolean) => {
    const checks = { ...state.checks, [date]: { ...(state.checks[date] ?? {}) } };
    if (done) checks[date][`${scope}:${secKey}:${pid}`] = true;
    else delete checks[date][`${scope}:${secKey}:${pid}`];
    setState({ ...state, checks });
    fetch("/api/checks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, scope, sectionKey: secKey, productId: pid, done }),
    }).catch(() => {});
  };

  const show = (i: number) => { follow.current = true; setStep(i); setNonce((n) => n + 1); };

  // tự chạy từng bước
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (cur >= steps.length - 1) { setPlaying(false); toast("Xong cả routine rồi!"); return; }
      show(cur + 1);
    }, PLAY_MS);
    return () => clearTimeout(t);
  }, [playing, cur, steps.length, nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // đưa bước đang xem vào giữa màn hình
  useEffect(() => {
    if (!follow.current) return;
    follow.current = false;
    listRef.current?.querySelector<HTMLElement>(".ts.active")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [cur, nonce]);

  // reset khi đổi ngày / mục / buổi
  useEffect(() => {
    setStep(pending.current ?? 0); pending.current = null; setPlaying(false); setNonce((n) => n + 1);
  }, [scope, secKey, date]);
  const pickFromFlow = (sec: string, i: number) => {
    setMode("steps");
    if (sec === secKey) show(i);
    else { pending.current = i; follow.current = true; setSection(sec); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (editing) {
    return <ScheduleEditor scope={scope} setScope={setScope} initialWeek={wk} initialDay={di}
      state={state} mutate={mutate} onDone={() => setEditing(false)} />;
  }

  const layers = steps.slice(0, cur + 1)
    .map((s, i) => ({ i, p: byId[s.p] }))
    .filter(({ p }) => p && !RINSE.has(GROUP_ICON[p.group] ?? ""));
  const look = productLook(curProd?.group);
  const doneCount = steps.filter((s) => isDone(s.p)).length;

  return (
    <section className="view">
      <div className="top">
        <div className="grow">
          <div className="sub">{DAY_NAMES[di]} · {WEEK_LABEL[wk]}{day?.focus ? ` · ${day.focus}` : ""}</div>
          <h1>Lịch trình</h1>
        </div>
        <button className="iconbtn" aria-label="Chỉnh lịch" onClick={() => setEditing(true)}><G name="edit" size={20} /></button>
      </div>

      <div className="chips" role="group" aria-label="Mục">
        {SCOPES.map((s) => (
          <button key={s} aria-pressed={scope === s} onClick={() => setScope(s)}>{SCOPE_LABEL[s]}</button>
        ))}
      </div>

      <div className="daystrip" role="group" aria-label="Ngày">
        {weekDates.map((x) => {
          const k = dateKey(x);
          return (
            <button key={k} aria-pressed={k === date} className={k === dateKey(today) ? "is-today" : ""} onClick={() => setDate(k)}>
              <span>{state.routines[scope][weekOf(x, state.settings.cycleStart)]?.[dayIndex(x)]?.short ?? ""}</span>
              <b>{x.getDate()}</b>
            </button>
          );
        })}
      </div>

      <div className="seg" role="group" aria-label="Kiểu xem">
        <button aria-pressed={mode === "steps"} onClick={() => setMode("steps")}>Từng bước</button>
        <button aria-pressed={mode === "flow"} onClick={() => { setPlaying(false); setMode("flow"); }}>Sơ đồ cả ngày</button>
      </div>

      {mode === "flow" ? (
        <FlowChart scope={scope} day={day} byId={byId} isDone={(sec, pid) => !!state.checks[date]?.[`${scope}:${sec}:${pid}`]} onPick={pickFromFlow} />
      ) : <>
      {sectionKeys.length > 1 && (
        <div className="seg" role="group" aria-label="Buổi">
          {sectionKeys.map((k) => (
            <button key={k} aria-pressed={secKey === k} onClick={() => setSection(k)}>
              {SECTION_META[scope][k].tone === "am" ? "☀︎ " : "☾ "}{SECTION_META[scope][k].title}
            </button>
          ))}
        </div>
      )}

      {steps.length === 0 ? (
        <div className="card empty">Không có bước nào cho {SECTION_META[scope][secKey]?.title.toLowerCase()} ngày này. Bấm ✎ để thêm.</div>
      ) : (
        <>
          <div className="rstage" aria-live="polite">
            <div className="sun" style={{ background: look.bg }} />
            <div className="stepcap">
              <span className="n">Bước {cur + 1} / {steps.length} · {curProd?.group}</span>
              <span className="t">{curProd?.name ?? "(đã xoá)"}</span>
            </div>
            <div key={`g${nonce}`} className="glow go" style={{ background: `radial-gradient(circle, ${look.col} 0%, transparent 70%)` }} />
            <FaceArt />
            <div key={`p${nonce}`} className="prod go"><ProductArt group={curProd?.group} size={100} /></div>
            <div key={`d${nonce}`} className="drop go" style={{ background: look.col }} />
            <div className="stack">
              {layers.map(({ i, p }, j) => (
                <div key={`${i}-${p.id}`} className={`layer ${i === cur ? "new" : ""}`}
                  style={{ background: productLook(p.group).col, height: 9 + j * 2.5 }} title={p.name} />
              ))}
              <div className="lbl">Các lớp trên da</div>
            </div>
          </div>

          <div className="controls">
            <button className="iconbtn" aria-label="Bước trước" disabled={cur === 0} onClick={() => { setPlaying(false); show(cur - 1); }}><G name="prev" size={20} width={2.5} /></button>
            <button className="pill grow" onClick={() => { if (playing) setPlaying(false); else { show(0); setPlaying(true); } }}>
              {playing ? "❚❚ Tạm dừng" : "▶ Xem cả routine"}
            </button>
            <button className="iconbtn" aria-label="Bước sau" disabled={cur >= steps.length - 1} onClick={() => { setPlaying(false); show(cur + 1); }}><G name="next" size={20} width={2.5} /></button>
          </div>

          <div className="detail">
            <p>{curStep?.n || curProd?.note || `Thoa ${curProd?.group.toLowerCase() ?? "sản phẩm"} đều lên da.`}</p>
            {curProd && (
              <button className={`pill sm ${isDone(curProd.id) ? "soft" : ""}`} onClick={() => {
                const was = isDone(curProd.id);
                setDone(curProd.id, !was);
                if (!was && cur < steps.length - 1) show(cur + 1);
                if (!was && cur === steps.length - 1) toast("Xong cả routine rồi!");
              }}>{isDone(curProd.id) ? "Bỏ đánh dấu" : "✓ Xong bước này"}</button>
            )}
          </div>

          <div className="label">Thứ tự sử dụng · đã xong {doneCount}/{steps.length}</div>
          <ol className="timeline" ref={listRef}>
            {steps.map((s, i) => {
              const p = byId[s.p];
              const done = isDone(s.p);
              return (
                <li key={`${s.p}-${i}`} className={`ts ${i === cur ? "active" : ""} ${done ? "done" : ""}`}>
                  <button className="ts-main" onClick={() => { setPlaying(false); show(i); }}>
                    <span className="thumb" style={{ background: productLook(p?.group).bg }}>
                      <span className="num">{i + 1}</span><ProductArt group={p?.group} size={42} />
                    </span>
                    <span className="info">
                      <span className="nm">{p?.name ?? "(đã xoá)"}</span>
                      <span className="meta">{s.n || p?.group}</span>
                    </span>
                  </button>
                  {p && (
                    <button className="tick" aria-label={done ? "Bỏ đánh dấu" : "Đánh dấu đã xong"} aria-pressed={done}
                      onClick={() => setDone(s.p, !done)}><G name="check" size={14} width={3.5} /></button>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
      </>}
    </section>
  );
}

/* ================= SƠ ĐỒ CẢ NGÀY ================= */
type FlowItem =
  | { t: "sec"; key: string; label: string; x: number; y: number; w: number; h: number; row: number }
  | { t: "step"; key: string; i: number; n: number; p?: Product; x: number; y: number; w: number; h: number; row: number };

/** Lưới gọn: 3 ô mỗi hàng, đi theo hình chữ S trong từng buổi để cả ngày vừa một màn hình */
const FW = 340, COLS = 3, TILE_W = 96, TILE_H = 74, GAP_X = (FW - COLS * TILE_W) / (COLS - 1), GAP_Y = 14, PILL_W = 150, PILL_H = 26;

/** Ngắt tên dài thành tối đa `max` dòng, mỗi dòng ~`len` ký tự */
function wrap(text: string, len: number, max: number) {
  const words = text.split(/\s+/), lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > len && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  for (let k = 0; k < lines.length; k++) if (lines[k].length > len) lines[k] = lines[k].slice(0, len - 1) + "…";
  if (lines.length > max) { lines.length = max; lines[max - 1] = lines[max - 1].slice(0, len - 1).replace(/\s*$/, "") + "…"; }
  return lines;
}

function FlowChart({ scope, day, byId, isDone, onPick }: {
  scope: Scope; day?: { sections: { key: string; steps: Step[] }[] }; byId: Record<string, Product>;
  isDone: (sec: string, pid: string) => boolean; onPick: (sec: string, i: number) => void;
}) {
  const [run, setRun] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  // đưa cả sơ đồ vào khung nhìn khi mở
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo({ top: Math.max(0, top - Math.max(0, window.innerHeight - 100 - el.offsetHeight - 12)), behavior: "smooth" });
  }, [scope, day]);
  const { items, H, path, links } = useMemo(() => {
    const items: FlowItem[] = [];
    let y = 2, row = 0;
    const order = Object.keys(SECTION_META[scope]);
    const secs = [...(day?.sections ?? [])].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)).filter((s) => s.steps.length);
    secs.forEach((sec, si) => {
      const meta = SECTION_META[scope][sec.key];
      if (si > 0) y += 6;
      items.push({ t: "sec", key: sec.key, row: row++, label: `${meta?.tone === "pm" ? "☾" : "☀︎"} ${meta?.title ?? sec.key} · ${sec.steps.length} bước`, x: (FW - PILL_W) / 2, y, w: PILL_W, h: PILL_H });
      y += PILL_H + 14;
      sec.steps.forEach((st, i) => {
        const r = Math.floor(i / COLS), c = i % COLS;
        const col = r % 2 === 0 ? c : COLS - 1 - c; // chữ S: hàng lẻ đi ngược lại
        items.push({ t: "step", key: sec.key, i, n: i + 1, p: byId[st.p], row: row + r, x: col * (TILE_W + GAP_X), y: y + r * (TILE_H + GAP_Y), w: TILE_W, h: TILE_H });
      });
      const rows = Math.ceil(sec.steps.length / COLS);
      row += rows;
      y += rows * (TILE_H + GAP_Y) - GAP_Y + 12;
    });
    const cx = (it: FlowItem) => it.x + it.w / 2, cy = (it: FlowItem) => it.y + it.h / 2;
    const links: string[] = [];
    let path = items.length ? `M${cx(items[0])} ${cy(items[0])}` : "";
    items.forEach((b, k) => {
      if (k === 0) return;
      const a = items[k - 1];
      let d: string;
      if (a.row === b.row) {
        // cùng hàng: mũi tên ngang
        const right = b.x > a.x;
        const x1 = right ? a.x + a.w : a.x, x2 = right ? b.x : b.x + b.w;
        d = `M${x1} ${cy(a)} L${x2} ${cy(b)}`;
      } else {
        // xuống hàng: đường cong từ đáy ô trên tới đỉnh ô dưới
        const x1 = cx(a), y1 = a.y + a.h, x2 = cx(b), y2 = b.y, m = (y2 - y1) * 0.9;
        d = `M${x1} ${y1} C${x1} ${y1 + m} ${x2} ${y2 - m} ${x2} ${y2}`;
      }
      links.push(d);
      path += ` L${d.slice(1)} L${cx(b)} ${cy(b)}`;
    });
    return { items, H: y, path, links };
  }, [scope, day, byId]);

  if (!items.length) return <div className="card empty">Ngày này chưa có bước nào. Bấm ✎ để thêm.</div>;
  const STEP_S = 0.18;
  const total = items.length * STEP_S + 0.5;

  return (
    <div className="card flow" ref={box}>
      <button className="replay" aria-label="Chạy lại sơ đồ" onClick={() => setRun((r) => r + 1)}>↻</button>
      <svg key={run} className="flowsvg" viewBox={`0 -2 ${FW} ${H + 2}`} role="img" aria-label="Sơ đồ thứ tự dùng sản phẩm trong ngày">
        <defs>
          <marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#A9B7C6" />
          </marker>
        </defs>
        {links.map((d, k) => (
          <g key={k}>
            <path d={d} className="flink-bg" />
            <path d={d} className="flink" pathLength={1} markerEnd="url(#fa)" style={{ animationDelay: `${(k + 0.7) * STEP_S}s` }} />
          </g>
        ))}
        {items.map((it, k) => {
          const delay = { animationDelay: `${k * STEP_S}s` };
          if (it.t === "sec") {
            return (
              <g key={k} className="fnode" style={delay}>
                <rect x={it.x} y={it.y} width={it.w} height={it.h} rx={it.h / 2} fill="#2D3A47" />
                <text x={it.x + it.w / 2} y={it.y + it.h / 2 + 4} textAnchor="middle" className="ftext pill-t">{it.label}</text>
              </g>
            );
          }
          const look = productLook(it.p?.group);
          const done = it.p ? isDone(it.key, it.p.id) : false;
          const name = wrap(it.p?.name ?? "(đã xoá)", 15, 2);
          return (
            <g key={k} className="fnode step" style={delay} role="button" tabIndex={0}
              aria-label={`Bước ${it.n}: ${it.p?.name ?? ""}`}
              onClick={() => onPick(it.key, it.i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPick(it.key, it.i); }}>
              <title>{it.p?.name}</title>
              <rect x={it.x} y={it.y} width={it.w} height={it.h} rx="16" fill="#FFFCF5" stroke={done ? "#A8B58A" : "#EFE5D0"} strokeWidth={done ? 2.5 : 1.5} />
              <rect x={it.x + 5} y={it.y + 5} width={it.w - 10} height="38" rx="12" fill={look.bg} />
              <g transform={`translate(${it.x + it.w / 2 - 12.4} ${it.y + 7})`}><g className="fart"><ProductArt group={it.p?.group} size={34} /></g></g>
              <circle cx={it.x + 8} cy={it.y + 8} r="9" fill={done ? "#A8B58A" : "#2D3A47"} />
              <text x={it.x + 8} y={it.y + 11.5} textAnchor="middle" className="ftext num-t">{done ? "✓" : it.n}</text>
              {name.map((ln, j) => (
                <text key={j} x={it.x + it.w / 2} y={it.y + 55 + j * 12.5 + (name.length === 1 ? 6 : 0)} textAnchor="middle" className="ftext name-t">{ln}</text>
              ))}
            </g>
          );
        })}
        <circle r="5" className="fdot" opacity="0">
          <set attributeName="opacity" to="1" begin={`${total}s`} />
          <animateMotion dur={`${Math.max(4, items.length * 0.7)}s`} begin={`${total}s`} repeatCount="indefinite" path={path} />
        </circle>
      </svg>
      <div className="small">Đi theo mũi tên · bấm vào một bước để xem cách dùng.</div>
    </div>
  );
}

function FaceArt() {
  return (
    <svg className="face" viewBox="0 0 170 200" aria-hidden="true">
      <ellipse cx="88" cy="196" rx="70" ry="30" fill="#E9C9B1" />
      <rect x="74" y="150" width="28" height="34" rx="12" fill="#F2D3BC" />
      <circle cx="88" cy="92" r="66" fill="#3B4654" />
      <circle cx="88" cy="26" r="22" fill="#3B4654" />
      <ellipse cx="88" cy="110" rx="50" ry="56" fill="#F6DCC7" />
      <path d="M40 92c10-34 70-44 98-10-24-10-56-12-98 10z" fill="#3B4654" />
      <path d="M64 106q7 6 14 0M98 106q7 6 14 0" stroke="#2D3A47" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="60" cy="124" rx="9" ry="5.5" fill="#F7C8D3" /><ellipse cx="116" cy="124" rx="9" ry="5.5" fill="#F7C8D3" />
      <path d="M80 136q8 7 16 0" stroke="#B46A72" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M58 70c8-6 14-8 22-8" stroke="#FFF7E6" strokeWidth="10" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}

/* ================= CHỈNH LỊCH ================= */
function ScheduleEditor({ scope, setScope, initialWeek, initialDay, state, mutate, onDone }: {
  scope: Scope; setScope: (s: Scope) => void; initialWeek: "A" | "B"; initialDay: number;
  state: State; mutate: Mutate; onDone: () => void;
}) {
  const [week, setWeek] = useState<"A" | "B">(initialWeek);
  const [day, setDay] = useState(initialDay);
  const [dragFrom, setDragFrom] = useState<{ sec: number; idx: number } | null>(null);
  const [adding, setAdding] = useState<Record<number, string>>({});

  const days = state.routines[scope][week];
  const current = days[day];
  const products = state.products.filter((p) => p.scope === scope);
  const byId = Object.fromEntries(state.products.map((p) => [p.id, p]));

  const putSection = (secIdx: number, steps: Step[]) =>
    mutate("lịch", () => api("/api/routine/section", "PUT", { scope, week, dayIndex: day, key: current.sections[secIdx].key, steps }));
  const reorder = (secIdx: number, from: number, to: number) => {
    const steps = [...current.sections[secIdx].steps];
    if (to < 0 || to >= steps.length) return;
    const [moved] = steps.splice(from, 1);
    steps.splice(to, 0, moved);
    putSection(secIdx, steps);
  };
  const editNote = (secIdx: number, idx: number) => {
    const st = current.sections[secIdx].steps[idx];
    const n = prompt("Ghi chú cho bước này:", st.n);
    if (n === null) return;
    putSection(secIdx, current.sections[secIdx].steps.map((s, i) => (i === idx ? { ...s, n } : s)));
  };

  return (
    <section className="view">
      <div className="top">
        <div className="grow"><div className="sub">{SCOPE_LABEL[scope]} · {WEEK_LABEL[week]}</div><h1>Chỉnh lịch</h1></div>
        <button className="pill" onClick={onDone}>Xong</button>
      </div>

      <div className="chips" role="group" aria-label="Mục">
        {SCOPES.map((s) => <button key={s} aria-pressed={scope === s} onClick={() => setScope(s)}>{SCOPE_LABEL[s]}</button>)}
      </div>
      <div className="seg" role="group" aria-label="Tuần trong chu kỳ">
        {(["A", "B"] as const).map((w) => <button key={w} aria-pressed={week === w} onClick={() => setWeek(w)}>{WEEK_LABEL[w]}</button>)}
      </div>
      <div className="daystrip" role="group" aria-label="Thứ">
        {days.map((d, i) => (
          <button key={i} aria-pressed={i === day} onClick={() => setDay(i)}><span>{d.short}</span><b>{d.full.split(" ").pop()}</b></button>
        ))}
      </div>

      <div className="card row">
        <div className="grow"><div className="label">Trọng tâm {current.full.toLowerCase()}</div><div className="h3">{current.focus || "—"}</div></div>
        <button className="iconbtn" aria-label="Sửa trọng tâm" onClick={() => {
          const focus = prompt("Trọng tâm của ngày:", current.focus);
          if (focus === null) return;
          mutate("lịch", () => api("/api/routine/day", "PATCH", { scope, week, dayIndex: day, focus }));
        }}><G name="edit" size={18} /></button>
      </div>

      {current.sections.map((sec, secIdx) => {
        const meta = SECTION_META[scope][sec.key] ?? { title: sec.key, sub: "", tone: "am" as const };
        const sel = adding[secIdx] ?? products[0]?.id ?? "";
        return (
          <div className={`card group ${meta.tone}`} key={sec.key}>
            <div className="group-head"><div className="grow"><div className="h3">{meta.title}</div><div className="small">{meta.sub}</div></div></div>
            <ul className="edit-list">
              {sec.steps.length === 0 && <li className="small">Chưa có bước nào.</li>}
              {sec.steps.map((st, idx) => {
                const p = byId[st.p];
                return (
                  <li key={`${st.p}-${idx}`} draggable
                    onDragStart={() => setDragFrom({ sec: secIdx, idx })}
                    onDragOver={(e) => { if (dragFrom?.sec === secIdx) e.preventDefault(); }}
                    onDrop={(e) => { if (dragFrom?.sec !== secIdx) return; e.preventDefault(); reorder(secIdx, dragFrom.idx, idx); setDragFrom(null); }}>
                    <span className="thumb sm" style={{ background: productLook(p?.group).bg }}><ProductArt group={p?.group} size={30} /></span>
                    <span className="info">
                      <span className="nm">{idx + 1}. {p?.name ?? "(sản phẩm đã xoá)"}
                        {p && p.status !== "active" && <span className={`status s-${p.status}`}>{STATUS[p.status]}</span>}</span>
                      {st.n && <span className="meta">{st.n}</span>}
                    </span>
                    <span className="acts">
                      <button aria-label="Lên" disabled={idx === 0} onClick={() => reorder(secIdx, idx, idx - 1)}>▲</button>
                      <button aria-label="Xuống" disabled={idx === sec.steps.length - 1} onClick={() => reorder(secIdx, idx, idx + 1)}>▼</button>
                      <button aria-label="Sửa ghi chú" onClick={() => editNote(secIdx, idx)}>✎</button>
                      <button aria-label="Bỏ bước" onClick={() => putSection(secIdx, sec.steps.filter((_, i) => i !== idx))}>✕</button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="add-step">
              <select aria-label="Chọn sản phẩm" value={sel} onChange={(e) => setAdding({ ...adding, [secIdx]: e.target.value })}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.group} — {p.name}{p.status !== "active" ? ` (${STATUS[p.status]})` : ""}</option>
                ))}
              </select>
              <button className="pill soft sm" onClick={() => {
                if (!sel) return;
                putSection(secIdx, [...sec.steps, { p: sel, n: byId[sel]?.note ?? "" }]);
              }}>+ Thêm</button>
            </div>
          </div>
        );
      })}

      <button className="pill soft" onClick={() => {
        if (!confirm(`Chép toàn bộ lịch ${WEEK_LABEL[week]} đè lên tuần còn lại?`)) return;
        mutate("lịch", () => api("/api/routine/copy", "POST", { scope, from: week, to: week === "A" ? "B" : "A" }));
      }}>⧉ Chép lịch sang tuần còn lại</button>
    </section>
  );
}
