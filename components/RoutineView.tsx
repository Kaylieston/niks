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
  const [mode, setMode] = useState<"steps" | "flow">("flow");
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
        <button aria-pressed={mode === "steps"} onClick={() => setMode("steps")}>Minh hoạ</button>
        <button aria-pressed={mode === "flow"} onClick={() => { setPlaying(false); setMode("flow"); }}>Hành trình</button>
      </div>

      {sectionKeys.length > 1 && (
        <div className="seg" role="group" aria-label="Buổi">
          {sectionKeys.map((k) => (
            <button key={k} aria-pressed={secKey === k} onClick={() => setSection(k)}>
              {SECTION_META[scope][k].tone === "am" ? "☀︎ " : "☾ "}{SECTION_META[scope][k].title}
            </button>
          ))}
        </div>
      )}

      {mode === "flow" ? (
        steps.length === 0
          ? <div className="card empty">Không có bước nào cho {SECTION_META[scope][secKey]?.title.toLowerCase()} ngày này. Bấm ✎ để thêm.</div>
          : <Journey tone={SECTION_META[scope][secKey]?.tone ?? "am"} title={SECTION_META[scope][secKey]?.title ?? ""} steps={steps} byId={byId}
              isDone={isDone} setDone={setDone} onOpen={(i) => pickFromFlow(secKey, i)} />
      ) : steps.length === 0 ? (
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
    </section>
  );
}

/* ================= HÀNH TRÌNH (tick từng sản phẩm) ================= */
function Journey({ tone, title, steps, byId, isDone, setDone, onOpen }: {
  tone: "am" | "pm"; title: string; steps: Step[]; byId: Record<string, Product>;
  isDone: (pid: string) => boolean; setDone: (pid: string, done: boolean) => void; onOpen: (i: number) => void;
}) {
  const done = steps.filter((s) => isDone(s.p)).length;
  const left = steps.length - done;
  const pct = steps.length ? done / steps.length : 0;
  return (
    <>
      <div className={`scene ${tone}`}>
        <SceneArt tone={tone} />
        <div className="trail">
          <div className="trail-head">
            <span>{title}</span>
            <span>{done}/{steps.length} bước</span>
          </div>
          <div className="track">
            <span className="tnode start" aria-hidden="true">{tone === "am" ? "☀︎" : "☾"}</span>
            <div className="rail">
              <i className="rail-done" style={{ width: `${pct * 100}%` }} />
              {steps.map((s, i) => (
                <b key={i} className={`rdot ${isDone(s.p) ? "on" : ""}`} style={{ left: `${((i + 1) / steps.length) * 100}%` }} />
              ))}
              <img className="cat" src="/icons/cat-avatar.png" alt="" style={{ left: `${pct * 100}%` }} />
            </div>
            <span className={`tnode end ${left === 0 ? "on" : ""}`} aria-hidden="true">✓</span>
          </div>
        </div>
      </div>

      <div className="jhead">
        <span className="jcal" aria-hidden="true"><G name="check" size={14} width={3} /></span>
        {left === 0 ? `Xong hết ${title.toLowerCase()} rồi, giỏi quá!` : `Còn ${left} bước cho ${title.toLowerCase()}!`}
      </div>

      <ol className="jlist">
        {steps.map((s, i) => {
          const p = byId[s.p];
          const on = isDone(s.p);
          const look = productLook(p?.group);
          return (
            <li key={`${s.p}-${i}`} className={`jcard ${on ? "done" : ""}`}>
              <button className="jmain" onClick={() => onOpen(i)} aria-label={`Xem cách dùng bước ${i + 1}: ${p?.name ?? ""}`}>
                <span className="jthumb" style={{ background: look.bg }}>
                  <ProductArt group={p?.group} size={46} />
                  <span className="jnum">{i + 1}</span>
                </span>
                <span className="info">
                  <span className="jname">{p?.name ?? "(đã xoá)"}</span>
                  <span className="jsub">{s.n || p?.group}</span>
                </span>
              </button>
              {p && (
                <button className="jtick" aria-pressed={on} aria-label={on ? `Bỏ đánh dấu ${p.name}` : `Đánh dấu đã dùng ${p.name}`}
                  onClick={() => setDone(s.p, !on)}>
                  <G name="check" size={24} width={3} />
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** Cảnh minh hoạ nhỏ: đồi, hoa có mặt cười, mặt trời hoặc trăng */
function SceneArt({ tone }: { tone: "am" | "pm" }) {
  const am = tone === "am";
  const flower = (x: number, y: number, petal: string, s = 1) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C-2 14 2 22 0 34" stroke="#7E9460" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="-8" cy="22" rx="7" ry="3.5" fill="#8FA071" transform="rotate(-30 -8 22)" />
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-9" rx="6.5" ry="9" fill={petal} transform={`rotate(${a})`} />)}
      <circle r="6.5" fill="#FCE3A6" />
      <path d="M-3 -1q1.2 1.5 2.4 0M0.8 -1q1.2 1.5 2.4 0" stroke="#2D3A47" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </g>
  );
  return (
    <svg className="scene-art" viewBox="0 0 350 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={am ? "#E5EAF0" : "#3E4C5C"} />
          <stop offset="1" stopColor={am ? "#FFF7E6" : "#6E7F93"} />
        </linearGradient>
      </defs>
      <rect width="350" height="150" fill={`url(#sky-${tone})`} />
      {am ? (
        <g className="sky-body"><circle cx="292" cy="34" r="20" fill="#FCE3A6" /><circle cx="292" cy="34" r="28" fill="#FCE3A6" opacity=".35" /></g>
      ) : (
        <g className="sky-body">
          <path d="M296 16a20 20 0 1 0 14 34 16 16 0 1 1-14-34z" fill="#FFF0CF" />
          {[[40, 22], [90, 40], [150, 18], [220, 30], [330, 70]].map(([x, y], k) => (
            <path key={k} className="twinkle" style={{ animationDelay: `${k * 0.4}s` }} d={`M${x} ${y - 4}l1 3 3 1-3 1-1 3-1-3-3-1 3-1z`} fill="#FFF7E6" />
          ))}
        </g>
      )}
      <ellipse cx="70" cy="150" rx="150" ry="58" fill={am ? "#C7D1A8" : "#7E8F6E"} />
      <ellipse cx="290" cy="156" rx="140" ry="62" fill={am ? "#B8C496" : "#6F8060"} />
      <g className="sway">{flower(54, 70, "#F7C8D3")}</g>
      <g className="sway" style={{ animationDelay: ".6s" }}>{flower(106, 84, "#FFF7E6", 0.8)}</g>
      <g className="sway" style={{ animationDelay: "1.1s" }}>{flower(236, 76, "#EFA9BA", 0.9)}</g>
      {am && [[150, 50], [190, 70], [24, 40]].map(([x, y], k) => (
        <path key={k} className="twinkle" style={{ animationDelay: `${k * 0.5}s` }} d={`M${x} ${y - 5}l1.3 3.7 3.7 1.3-3.7 1.3-1.3 3.7-1.3-3.7-3.7-1.3 3.7-1.3z`} fill="#FFFCF5" />
      ))}
    </svg>
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
