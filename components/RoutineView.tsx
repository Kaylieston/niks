"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { GROUPS, GROUP_ICON, SECTION_META, type Scope } from "@/lib/defaults";
import { useI18n } from "@/lib/i18n";
import { dateKey, dayIndex, parseKey, weekOf } from "@/lib/dates";
import type { Mutate, Product, State, Step } from "@/lib/types";
import { G, ProductArt, productLook } from "./art";
import { Sheet, api } from "./ui";
import { SkinCheck } from "./Skin";
import type { RoutineTarget } from "./NiksApp";

const SCOPES: Scope[] = ["face", "hair", "body"];
/** Sản phẩm rửa trôi — không để lại lớp trên da */
const RINSE = new Set(["micellar", "cleanser", "exfoliant", "water", "mask"]);
const PLAY_MS = 2800;

export default function RoutineView({ state, setState, mutate, target, toast }: {
  state: State; setState: (s: State) => void; mutate: Mutate; target: RoutineTarget | null; toast: (m: string) => void;
}) {
  const { tr, L } = useI18n();
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
      if (cur >= steps.length - 1) { setPlaying(false); toast(tr("Xong cả routine rồi!", "Routine complete!")); return; }
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
      state={state} mutate={mutate} toast={toast} onDone={() => setEditing(false)} />;
  }

  const secTitle = L.section[scope][secKey]?.[0] ?? "";
  const layers = steps.slice(0, cur + 1)
    .map((s, i) => ({ i, p: byId[s.p] }))
    .filter(({ p }) => p && !RINSE.has(GROUP_ICON[p.group] ?? ""));
  const look = productLook(curProd?.group);
  const doneCount = steps.filter((s) => isDone(s.p)).length;

  return (
    <section className="view">
      <div className="top">
        <div className="grow">
          <div className="sub">{L.days[di]} · {L.week[wk]}{day?.focus ? ` · ${day.focus}` : ""}</div>
          <h1>{tr("Lịch trình", "Routine")}</h1>
        </div>
        <button className="iconbtn" aria-label={tr("Chỉnh lịch", "Edit routine")} onClick={() => setEditing(true)}><G name="edit" size={20} /></button>
      </div>

      <div className="chips" role="group" aria-label={tr("Mục", "Area")}>
        {SCOPES.map((s) => (
          <button key={s} aria-pressed={scope === s} onClick={() => setScope(s)}>{L.scope[s]}</button>
        ))}
      </div>

      <div className="daystrip" role="group" aria-label={tr("Ngày", "Day")}>
        {weekDates.map((x) => {
          const k = dateKey(x);
          return (
            <button key={k} aria-pressed={k === date} className={k === dateKey(today) ? "is-today" : ""} onClick={() => setDate(k)}>
              <span>{L.dow[dayIndex(x)]}</span>
              <b>{x.getDate()}</b>
            </button>
          );
        })}
      </div>

      <div className="seg" role="group" aria-label={tr("Kiểu xem", "View")}>
        <button aria-pressed={mode === "steps"} onClick={() => setMode("steps")}>{tr("Minh hoạ", "Walkthrough")}</button>
        <button aria-pressed={mode === "flow"} onClick={() => { setPlaying(false); setMode("flow"); }}>{tr("Hành trình", "Journey")}</button>
      </div>

      {sectionKeys.length > 1 && (
        <div className="seg" role="group" aria-label={tr("Buổi", "Time of day")}>
          {sectionKeys.map((k) => (
            <button key={k} aria-pressed={secKey === k} onClick={() => setSection(k)}>
              {SECTION_META[scope][k].tone === "am" ? "☀︎ " : "☾ "}{L.section[scope][k][0]}
            </button>
          ))}
        </div>
      )}

      {mode === "flow" ? (
        steps.length === 0
          ? <div className="card empty">{tr(`Không có bước nào cho ${secTitle.toLowerCase()} ngày này. Bấm ✎ để thêm.`, `Nothing planned for ${secTitle.toLowerCase()} on this day. Tap ✎ to add steps.`)}</div>
          : <Journey tone={SECTION_META[scope][secKey]?.tone ?? "am"} title={secTitle} steps={steps} byId={byId}
              isDone={isDone} setDone={setDone} onOpen={(i) => pickFromFlow(secKey, i)} />
      ) : steps.length === 0 ? (
        <div className="card empty">{tr(`Không có bước nào cho ${secTitle.toLowerCase()} ngày này. Bấm ✎ để thêm.`, `Nothing planned for ${secTitle.toLowerCase()} on this day. Tap ✎ to add steps.`)}</div>
      ) : (
        <>
          <div className="rstage" aria-live="polite">
            <div className="sun" style={{ background: look.bg }} />
            <div className="stepcap">
              <span className="n">{tr("Bước", "Step")} {cur + 1} / {steps.length} · {L.group(curProd?.group ?? "")}</span>
              <span className="t">{curProd?.name ?? tr("(đã xoá)", "(deleted)")}</span>
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
              <div className="lbl">{tr("Các lớp trên da", "Layers on skin")}</div>
            </div>
          </div>

          <div className="controls">
            <button className="iconbtn" aria-label={tr("Bước trước", "Previous step")} disabled={cur === 0} onClick={() => { setPlaying(false); show(cur - 1); }}><G name="prev" size={20} width={2.5} /></button>
            <button className="pill grow" onClick={() => { if (playing) setPlaying(false); else { show(0); setPlaying(true); } }}>
              {playing ? tr("❚❚ Tạm dừng", "❚❚ Pause") : tr("▶ Xem cả routine", "▶ Play the routine")}
            </button>
            <button className="iconbtn" aria-label={tr("Bước sau", "Next step")} disabled={cur >= steps.length - 1} onClick={() => { setPlaying(false); show(cur + 1); }}><G name="next" size={20} width={2.5} /></button>
          </div>

          <div className="detail">
            <p>{curStep?.n || curProd?.note || tr(`Thoa ${curProd?.group.toLowerCase() ?? "sản phẩm"} đều lên da.`, `Apply the ${L.group(curProd?.group ?? "").toLowerCase() || "product"} evenly.`)}</p>
            {curProd && (
              <button className={`pill sm ${isDone(curProd.id) ? "soft" : ""}`} onClick={() => {
                const was = isDone(curProd.id);
                setDone(curProd.id, !was);
                if (!was && cur < steps.length - 1) show(cur + 1);
                if (!was && cur === steps.length - 1) toast(tr("Xong cả routine rồi!", "Routine complete!"));
              }}>{isDone(curProd.id) ? tr("Bỏ đánh dấu", "Undo") : tr("✓ Xong bước này", "✓ Done with this step")}</button>
            )}
          </div>

          <div className="label">{tr("Thứ tự sử dụng", "Order of use")} · {tr("đã xong", "done")} {doneCount}/{steps.length}</div>
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
                      <span className="nm">{p?.name ?? tr("(đã xoá)", "(deleted)")}</span>
                      <span className="meta">{s.n || L.group(p?.group ?? "")}</span>
                    </span>
                  </button>
                  {p && (
                    <button className="tick" aria-label={done ? tr("Bỏ đánh dấu", "Undo") : tr("Đánh dấu đã xong", "Mark as done")} aria-pressed={done}
                      onClick={() => setDone(s.p, !done)}><G name="check" size={14} width={3.5} /></button>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

      <SkinCheck state={state} mutate={mutate} date={date} toast={toast} />
    </section>
  );
}

/* ================= HÀNH TRÌNH (tick từng sản phẩm) ================= */
function Journey({ tone, title, steps, byId, isDone, setDone, onOpen }: {
  tone: "am" | "pm"; title: string; steps: Step[]; byId: Record<string, Product>;
  isDone: (pid: string) => boolean; setDone: (pid: string, done: boolean) => void; onOpen: (i: number) => void;
}) {
  const { tr, L } = useI18n();
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
            <span>{done}/{steps.length} {tr("bước", "steps")}</span>
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
        {left === 0 ? tr(`Xong hết ${title.toLowerCase()} rồi, giỏi quá!`, `${title} all done, well done!`) : tr(`Còn ${left} bước cho ${title.toLowerCase()}!`, `${left} step${left > 1 ? "s" : ""} left for ${title.toLowerCase()}!`)}
      </div>

      <ol className="jlist">
        {steps.map((s, i) => {
          const p = byId[s.p];
          const on = isDone(s.p);
          const look = productLook(p?.group);
          return (
            <li key={`${s.p}-${i}`} className={`jcard ${on ? "done" : ""}`}>
              <button className="jmain" onClick={() => onOpen(i)} aria-label={`${tr("Xem cách dùng bước", "How to use step")} ${i + 1}: ${p?.name ?? ""}`}>
                <span className="jthumb" style={{ background: look.bg }}>
                  <ProductArt group={p?.group} size={46} />
                  <span className="jnum">{i + 1}</span>
                </span>
                <span className="info">
                  <span className="jname">{p?.name ?? tr("(đã xoá)", "(deleted)")}</span>
                  <span className="jsub">{s.n || L.group(p?.group ?? "")}</span>
                </span>
              </button>
              {p && (
                <button className="jtick" aria-pressed={on} aria-label={on ? `${tr("Bỏ đánh dấu", "Undo")} ${p.name}` : `${tr("Đánh dấu đã dùng", "Mark as used")} ${p.name}`}
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
function ScheduleEditor({ scope, setScope, initialWeek, initialDay, state, mutate, toast, onDone }: {
  scope: Scope; setScope: (s: Scope) => void; initialWeek: "A" | "B"; initialDay: number;
  state: State; mutate: Mutate; toast: (m: string) => void; onDone: () => void;
}) {
  const { tr, L } = useI18n();
  const [week, setWeek] = useState<"A" | "B">(initialWeek);
  const [day, setDay] = useState(initialDay);
  const [picker, setPicker] = useState<number | null>(null);
  const [noteFor, setNoteFor] = useState<{ sec: number; idx: number; text: string } | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const days = state.routines[scope][week];
  const current = days[day];
  const byId = Object.fromEntries(state.products.map((p) => [p.id, p]));

  const putSection = (secIdx: number, steps: Step[]) =>
    mutate(tr("lịch", "routine"), () => api("/api/routine/section", "PUT", { scope, week, dayIndex: day, key: current.sections[secIdx].key, steps }));
  const move = (secIdx: number, from: number, to: number) => {
    const steps = [...current.sections[secIdx].steps];
    if (from === to || to < 0 || to >= steps.length) return;
    const [moved] = steps.splice(from, 1);
    steps.splice(to, 0, moved);
    putSection(secIdx, steps);
  };

  return (
    <section className="view" onPointerDown={(e) => { if (!(e.target as HTMLElement).closest(".erow")) setOpenRow(null); }}>
      <div className="top">
        <div className="grow"><div className="sub">{L.scope[scope]} · {L.week[week]}</div><h1>{tr("Chỉnh lịch", "Edit routine")}</h1></div>
        <button className="pill" onClick={onDone}>{tr("Xong", "Done")}</button>
      </div>

      <div className="chips" role="group" aria-label={tr("Mục", "Area")}>
        {SCOPES.map((s) => <button key={s} aria-pressed={scope === s} onClick={() => setScope(s)}>{L.scope[s]}</button>)}
      </div>
      <div className="seg" role="group" aria-label={tr("Tuần trong chu kỳ", "Week of the cycle")}>
        {(["A", "B"] as const).map((w) => <button key={w} aria-pressed={week === w} onClick={() => setWeek(w)}>{L.week[w]}</button>)}
      </div>
      <div className="daystrip" role="group" aria-label={tr("Thứ", "Weekday")}>
        {days.map((d, i) => (
          <button key={i} aria-pressed={i === day} onClick={() => setDay(i)}><span>{L.dow[i]}</span><b className="wd">{L.days[i].split(" ").pop()!.slice(0, 4)}</b></button>
        ))}
      </div>

      <div className="card row">
        <div className="grow"><div className="label">{tr("Trọng tâm", "Focus for")} {L.days[day].toLowerCase()}</div><div className="h3">{current.focus || "—"}</div></div>
        <button className="iconbtn" aria-label={tr("Sửa trọng tâm", "Edit focus")} onClick={() => {
          const focus = prompt(tr("Trọng tâm của ngày:", "Focus of the day:"), current.focus);
          if (focus === null) return;
          mutate(tr("lịch", "routine"), () => api("/api/routine/day", "PATCH", { scope, week, dayIndex: day, focus }));
        }}><G name="edit" size={18} /></button>
      </div>

      <p className="hint">{tr("Kéo chấm ⠿ bên trái để đổi thứ tự · vuốt sang trái để sửa hoặc xoá.", "Drag the ⠿ dots to reorder · swipe left to edit or remove.")}</p>

      {current.sections.map((sec, secIdx) => {
        const meta = SECTION_META[scope][sec.key] ?? { tone: "am" as const };
        const [title, sub] = L.section[scope][sec.key] ?? [sec.key, ""];
        return (
          <div className={`card group ${meta.tone}`} key={sec.key}>
            <div className="group-head"><div className="grow"><div className="h3">{title}</div><div className="small">{sub}</div></div></div>
            {sec.steps.length === 0 ? <div className="small">{tr("Chưa có bước nào.", "No steps yet.")}</div> : (
              <DragList
                items={sec.steps}
                rowKey={(st, idx) => `${sec.key}-${st.p}-${idx}`}
                onMove={(from, to) => move(secIdx, from, to)}
                render={(st, idx, k) => {
                  const p = byId[st.p];
                  return (
                    <SwipeRow open={openRow === k} setOpen={(o) => setOpenRow(o ? k : null)}
                      actions={<>
                        <button className="sw-edit" onClick={() => { setOpenRow(null); setNoteFor({ sec: secIdx, idx, text: st.n }); }}>
                          <G name="edit" size={18} />{tr("Sửa", "Edit")}
                        </button>
                        <button className="sw-del" onClick={() => {
                          setOpenRow(null);
                          putSection(secIdx, sec.steps.filter((_, i) => i !== idx)).then((ok) => ok && toast(tr(`Đã bỏ ${p?.name ?? "bước"}`, `Removed ${p?.name ?? "step"}`)));
                        }}><G name="trash" size={18} />{tr("Xoá", "Remove")}</button>
                      </>}>
                      <span className="num">{idx + 1}</span>
                      <span className="thumb sm" style={{ background: productLook(p?.group).bg }}><ProductArt group={p?.group} size={30} /></span>
                      <span className="info">
                        <span className="nm">{p?.name ?? tr("(sản phẩm đã xoá)", "(deleted product)")}
                          {p && p.status !== "active" && <span className={`status s-${p.status}`}>{L.status[p.status]}</span>}</span>
                        <span className="meta">{st.n || L.group(p?.group ?? "")}</span>
                      </span>
                    </SwipeRow>
                  );
                }}
              />
            )}
            <button className="addstep" onClick={() => setPicker(secIdx)}>
              <G name="plus" size={18} width={2.5} />{tr("Thêm bước", "Add a step")}
            </button>
          </div>
        );
      })}

      <button className="pill soft" onClick={() => {
        if (!confirm(tr(`Chép toàn bộ lịch ${L.week[week]} đè lên tuần còn lại?`, `Copy the whole ${L.week[week]} schedule over the other week?`))) return;
        mutate(tr("lịch", "routine"), () => api("/api/routine/copy", "POST", { scope, from: week, to: week === "A" ? "B" : "A" }));
      }}>⧉ {tr("Chép lịch sang tuần còn lại", "Copy to the other week")}</button>

      <Sheet open={picker !== null} onClose={() => setPicker(null)} title={tr("Thêm sản phẩm vào lịch", "Add a product to the routine")}>
        {picker !== null && (
          <ProductPicker scope={scope} products={state.products} already={current.sections[picker]?.steps.map((s) => s.p) ?? []}
            onPick={(p) => {
              const sec = current.sections[picker];
              setPicker(null);
              putSection(picker, [...sec.steps, { p: p.id, n: p.note ?? "" }]).then((ok) => ok && toast(tr(`Đã thêm ${p.name}`, `Added ${p.name}`)));
            }} />
        )}
      </Sheet>

      <Sheet open={!!noteFor} onClose={() => setNoteFor(null)} title={tr("Ghi chú cho bước này", "Note for this step")}>
        {noteFor && (
          <form className="form" onSubmit={(e) => {
            e.preventDefault();
            const sec = current.sections[noteFor.sec];
            putSection(noteFor.sec, sec.steps.map((s, i) => (i === noteFor.idx ? { ...s, n: noteFor.text.trim() } : s)));
            setNoteFor(null);
          }}>
            <div className="small">{byId[current.sections[noteFor.sec]?.steps[noteFor.idx]?.p]?.name}</div>
            <textarea autoFocus value={noteFor.text} onChange={(e) => setNoteFor({ ...noteFor, text: e.target.value })}
              placeholder={tr("VD: Đợi da khô 10 phút", "e.g. Wait 10 minutes for skin to dry")} />
            <button className="pill wide" type="submit">{tr("Lưu", "Save")}</button>
          </form>
        )}
      </Sheet>
    </section>
  );
}

/** Danh sách kéo-thả bằng tay cầm ⋮⋮ (chạy được cả cảm ứng lẫn chuột) */
function DragList<T>({ items, rowKey, onMove, render }: {
  items: T[]; rowKey: (it: T, i: number) => string; onMove: (from: number, to: number) => void;
  render: (it: T, i: number, key: string) => React.ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number; h: number } | null>(null);
  const info = useRef<{ startY: number; mids: number[]; h: number } | null>(null);

  const start = (i: number, e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rows = Array.from(ref.current?.children ?? []) as HTMLElement[];
    const rects = rows.map((r) => r.getBoundingClientRect());
    info.current = { startY: e.clientY, mids: rects.map((r) => r.top + r.height / 2), h: rects[i].height + 8 };
    setDrag({ from: i, to: i, dy: 0, h: info.current.h });
    navigator.vibrate?.(8);
  };
  const moveP = (e: React.PointerEvent) => {
    if (!drag || !info.current) return;
    const dy = e.clientY - info.current.startY;
    const y = info.current.mids[drag.from] + dy;
    let to = drag.from;
    info.current.mids.forEach((m, j) => {
      if (j < drag.from && y < m) to = Math.min(to, j);
      if (j > drag.from && y > m) to = Math.max(to, j);
    });
    setDrag({ ...drag, dy, to });
  };
  const end = () => {
    if (drag && drag.to !== drag.from) onMove(drag.from, drag.to);
    setDrag(null); info.current = null;
  };

  return (
    <ul className={`edit-list ${drag ? "dragging" : ""}`} ref={ref}>
      {items.map((it, i) => {
        let ty = 0;
        if (drag) {
          if (i === drag.from) ty = drag.dy;
          else if (drag.from < drag.to && i > drag.from && i <= drag.to) ty = -drag.h;
          else if (drag.from > drag.to && i < drag.from && i >= drag.to) ty = drag.h;
        }
        const k = rowKey(it, i);
        return (
          <li key={k} className={`erow ${drag?.from === i ? "lifted" : ""}`} style={{ transform: ty ? `translateY(${ty}px)` : undefined }}>
            <span className="grip" aria-label="⋮⋮" role="button"
              onPointerDown={(e) => start(i, e)} onPointerMove={moveP} onPointerUp={end} onPointerCancel={end}>
              <G name="grip" size={20} width={3.2} />
            </span>
            {render(it, i, k)}
          </li>
        );
      })}
    </ul>
  );
}

/** Hàng vuốt sang trái để hiện nút Sửa / Xoá */
function SwipeRow({ open, setOpen, actions, children }: {
  open: boolean; setOpen: (o: boolean) => void; actions: React.ReactNode; children: React.ReactNode;
}) {
  const W = 148;
  const [dx, setDx] = useState<number | null>(null);
  const st = useRef<{ x: number; y: number; base: number; locked: "x" | "y" | null } | null>(null);
  const x = dx ?? (open ? -W : 0);
  return (
    <div className="swipe">
      <div className="sw-actions" style={{ width: W }} aria-hidden={!open}>{actions}</div>
      <div className="sw-main" style={{ transform: `translateX(${x}px)`, transition: dx === null ? "transform .3s var(--ease)" : "none" }}
        onPointerDown={(e) => { st.current = { x: e.clientX, y: e.clientY, base: open ? -W : 0, locked: null }; }}
        onPointerMove={(e) => {
          const s = st.current; if (!s) return;
          const mx = e.clientX - s.x, my = e.clientY - s.y;
          if (!s.locked && Math.abs(mx) + Math.abs(my) > 8) {
            s.locked = Math.abs(mx) > Math.abs(my) ? "x" : "y";
            if (s.locked === "x") (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }
          if (s.locked === "x") setDx(Math.max(-W - 30, Math.min(0, s.base + mx)));
        }}
        onPointerUp={() => {
          const s = st.current; st.current = null;
          if (s?.locked === "x" && dx !== null) setOpen(dx < -W / 2);
          else if (!s?.locked && open) setOpen(false);
          setDx(null);
        }}
        onPointerCancel={() => { st.current = null; setDx(null); }}>
        {children}
      </div>
    </div>
  );
}

/** Chọn sản phẩm để thêm vào lịch: tìm theo tên, lọc theo loại */
function ProductPicker({ scope, products, already, onPick }: {
  scope: Scope; products: Product[]; already: string[]; onPick: (p: Product) => void;
}) {
  const { tr, L } = useI18n();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");
  const mine = products.filter((p) => p.scope === scope && p.status !== "empty");
  const groups = GROUPS[scope].filter((g) => mine.some((p) => p.group === g));
  const list = mine
    .filter((p) => group === "all" || p.group === group)
    .filter((p) => (p.name + " " + p.group + " " + L.group(p.group)).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1));
  return (
    <div className="picker">
      <label className="search">
        <G name="search" size={18} width={2.4} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Tìm sản phẩm", "Search products")} />
      </label>
      <div className="chips scroll" role="group" aria-label={tr("Loại", "Category")}>
        <button aria-pressed={group === "all"} onClick={() => setGroup("all")}>{tr("Tất cả", "All")}</button>
        {groups.map((g) => <button key={g} aria-pressed={group === g} onClick={() => setGroup(g)}>{L.group(g)}</button>)}
      </div>
      <ul className="pick-list">
        {list.length === 0 && <li className="empty">{tr("Không tìm thấy sản phẩm phù hợp.", "No matching products.")}</li>}
        {list.map((p) => (
          <li key={p.id}>
            <button onClick={() => onPick(p)}>
              <span className="thumb sm" style={{ background: productLook(p.group).bg }}><ProductArt group={p.group} size={30} /></span>
              <span className="info">
                <span className="nm">{p.name}</span>
                <span className="meta">{L.group(p.group)}{p.status !== "active" ? ` · ${L.status[p.status]}` : ""}{already.includes(p.id) ? ` · ${tr("đã có trong buổi này", "already in this routine")}` : ""}</span>
              </span>
              <span className="plus"><G name="plus" size={18} width={2.6} /></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
