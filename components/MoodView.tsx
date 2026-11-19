"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { dateKey, parseKey } from "@/lib/dates";
import { MOODS, MOOD_BY_KEY, SKIN_TAGS } from "@/lib/moods";
import type { Mutate, State } from "@/lib/types";
import { G, MoodBlob } from "./art";
import { api } from "./ui";

type Range = "week" | "month" | "all";
const OTHER = "#E6DCC8";

export default function MoodView({ state, mutate, preselect, clearPreselect, toast }: {
  state: State; mutate: Mutate; preselect: string | null; clearPreselect: () => void; toast: (m: string) => void;
}) {
  const [date, setDate] = useState(dateKey());
  const existing = state.moods[date];
  const [pick, setPick] = useState<string | null>(preselect ?? existing?.mood ?? null);
  const [skin, setSkin] = useState<string[]>(existing?.skin ?? []);
  const [note, setNote] = useState(existing?.note ?? "");
  const [range, setRange] = useState<Range>("month");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const lastDate = useRef(date);

  useEffect(() => { if (preselect) { setPick(preselect); clearPreselect(); } }, [preselect, clearPreselect]);
  useEffect(() => {
    if (lastDate.current === date) return;
    lastDate.current = date;
    const e = state.moods[date];
    setPick(e?.mood ?? null); setSkin(e?.skin ?? []); setNote(e?.note ?? "");
  }, [date, state.moods]);

  const save = () => {
    if (!pick) { toast("Chọn một cảm xúc trước nhé"); return; }
    mutate("cảm xúc", () => api("/api/mood", "PUT", { date, mood: pick, skin, note }))
      .then((ok) => ok && toast(`Đã lưu: ${MOOD_BY_KEY[pick].name}`));
  };

  const d = parseKey(date);
  const isToday = date === dateKey();

  return (
    <section className="view">
      <div className="top">
        <div className="grow"><div className="sub">{isToday ? "Hôm nay" : `Ngày ${d.getDate()}/${d.getMonth() + 1}`}</div><h1>Cảm xúc</h1></div>
        <label className="iconbtn date-btn" aria-label="Chọn ngày">
          <input type="date" value={date} max={dateKey()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <span>{d.getDate()}/{d.getMonth() + 1}</span>
        </label>
      </div>

      <div className="card">
        <div className="h3 center">Lúc này, bạn thấy thế nào?</div>
        <div className="moodgrid">
          {MOODS.map((m) => (
            <button key={m.key} className="mb" aria-pressed={pick === m.key} onClick={() => setPick(m.key)}>
              <MoodBlob mood={m.key} size={54} />{m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack-gap">
        <div className="label">Da hôm nay thế nào? (không bắt buộc)</div>
        <div className="chips wrap">
          {SKIN_TAGS.map((t) => (
            <button key={t} className="tag" aria-pressed={skin.includes(t)}
              onClick={() => setSkin(skin.includes(t) ? skin.filter((x) => x !== t) : [...skin, t])}>{t}</button>
          ))}
        </div>
        <textarea id="mood-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú ngắn (không bắt buộc)" />
        <div className="row-btns">
          <button className="pill wide" onClick={save}>{existing ? "Cập nhật" : "Lưu cảm xúc"}</button>
          {existing && (
            <button className="pill soft" onClick={() => mutate("cảm xúc", () => api(`/api/mood?date=${date}`, "DELETE"))
              .then((ok) => { if (ok) { setPick(null); setSkin([]); setNote(""); toast("Đã xoá"); } })}>Xoá</button>
          )}
        </div>
      </div>

      <MoodStats moods={state.moods} range={range} setRange={setRange} />
      <MoodCalendar moods={state.moods} month={month} setMonth={setMonth} onPick={setDate} selected={date} />

      <JournalPanel state={state} mutate={mutate} toast={toast} />
    </section>
  );
}

function MoodStats({ moods, range, setRange }: { moods: State["moods"]; range: Range; setRange: (r: Range) => void }) {
  const { rows, total, title } = useMemo(() => {
    const now = new Date();
    const keys = Object.keys(moods).filter((k) => {
      if (range === "all") return true;
      const d = parseKey(k);
      if (range === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      return (now.getTime() - d.getTime()) / 86400000 < 7;
    });
    const cnt: Record<string, number> = {};
    for (const k of keys) cnt[moods[k].mood] = (cnt[moods[k].mood] ?? 0) + 1;
    let rows = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
    if (rows.length > 5) rows = [...rows.slice(0, 4), ["other", rows.slice(4).reduce((s, r) => s + r[1], 0)]];
    const title = range === "week" ? "7 ngày qua" : range === "month" ? `Tháng ${now.getMonth() + 1}` : "Từ trước tới nay";
    return { rows, total: keys.length, title };
  }, [moods, range]);

  const R = 56, C = 2 * Math.PI * R, GAP = rows.length > 1 ? 3 : 0;
  const [grow, setGrow] = useState(false);
  useEffect(() => { setGrow(false); const t = requestAnimationFrame(() => requestAnimationFrame(() => setGrow(true))); return () => cancelAnimationFrame(t); }, [rows]);

  let off = 0;
  return (
    <div className="card stack-gap">
      <div className="row-between">
        <div><div className="label">Cảm xúc của bạn</div><div className="h3">{title}</div></div>
        <div className="seg small" role="group" aria-label="Khoảng thời gian">
          {(["week", "month", "all"] as Range[]).map((r) => (
            <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>{r === "week" ? "Tuần" : r === "month" ? "Tháng" : "Tất cả"}</button>
          ))}
        </div>
      </div>
      {total === 0 ? (
        <div className="empty">Chưa có cảm xúc nào trong khoảng này. Ghi lại hôm nay để bắt đầu biểu đồ.</div>
      ) : (
        <div className="donutwrap">
          <div className="donut">
            <svg viewBox="0 0 150 150" role="img" aria-label={`Biểu đồ cảm xúc, ${total} ngày`}>
              <circle cx="75" cy="75" r={R} fill="none" stroke="var(--cream-2)" strokeWidth="24" />
              {rows.map(([k, v]) => {
                const len = Math.max(0, (v / total) * C - GAP);
                const el = (
                  <circle key={k} className="seg" cx="75" cy="75" r={R} fill="none" strokeWidth="24" strokeLinecap={rows.length > 1 ? "round" : "butt"}
                    stroke={k === "other" ? OTHER : MOOD_BY_KEY[k]?.color}
                    style={{ strokeDasharray: grow ? `${len} ${C - len}` : `0 ${C}`, strokeDashoffset: -off }} />
                );
                off += (v / total) * C;
                return el;
              })}
            </svg>
            <div className="ctr">
              <MoodBlob mood={rows[0][0] === "other" ? "okay" : rows[0][0]} size={44} />
              <b>{Math.round((rows[0][1] / total) * 100)}%</b>
              <span>{rows[0][0] === "other" ? "Khác" : MOOD_BY_KEY[rows[0][0]]?.name}</span>
            </div>
          </div>
          <ul className="legend">
            {rows.map(([k, v]) => (
              <li key={k}><i style={{ background: k === "other" ? OTHER : MOOD_BY_KEY[k]?.color }} />
                {k === "other" ? "Khác" : MOOD_BY_KEY[k]?.name}<em>{Math.round((v / total) * 100)}%</em></li>
            ))}
            <li className="small">{total} ngày đã ghi</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function MoodCalendar({ moods, month, setMonth, onPick, selected }: {
  moods: State["moods"]; month: Date; setMonth: (d: Date) => void; onPick: (k: string) => void; selected: string;
}) {
  const y = month.getFullYear(), m = month.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysIn = new Date(y, m + 1, 0).getDate();
  const today = dateKey();
  const isCurrent = y === new Date().getFullYear() && m === new Date().getMonth();
  return (
    <div className="card stack-gap">
      <div className="row-between">
        <div className="h3">Tháng {m + 1}, {y}</div>
        <div className="row-btns tight">
          <button className="iconbtn sm" aria-label="Tháng trước" onClick={() => setMonth(new Date(y, m - 1, 1))}><G name="prev" size={18} width={2.5} /></button>
          <button className="iconbtn sm" aria-label="Tháng sau" disabled={isCurrent} onClick={() => setMonth(new Date(y, m + 1, 1))}><G name="next" size={18} width={2.5} /></button>
        </div>
      </div>
      <div className="cal">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => <div key={d} className="dow">{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysIn }, (_, i) => {
          const k = dateKey(new Date(y, m, i + 1));
          const e = moods[k];
          const future = k > today;
          return (
            <button key={k} className={`d ${k === today ? "today" : ""} ${k === selected ? "sel" : ""}`} disabled={future}
              title={e ? `${i + 1}: ${MOOD_BY_KEY[e.mood]?.name}` : undefined} onClick={() => onPick(k)}>
              {e ? <MoodBlob mood={e.mood} size={36} /> : i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================= NHẬT KÝ DA ================= */
const METRICS = [
  { key: "acne", label: "Mụn viêm", color: "#B46A72" },
  { key: "dark", label: "Thâm", color: "#8E7FA6" },
  { key: "dry", label: "Khô / bong", color: "#C9A25E" },
  { key: "sting", label: "Châm chích", color: "#7E9460" },
] as const;
const BLANK = { acne: 2, dark: 2, dry: 2, sting: 1, note: "" };

function JournalPanel({ state, mutate, toast }: { state: State; mutate: Mutate; toast: (m: string) => void }) {
  const [date, setDate] = useState(dateKey());
  const [draft, setDraft] = useState(state.journal[date] ?? BLANK);
  const [confirmDel, setConfirmDel] = useState(false);
  const lastDate = useRef(date);
  useEffect(() => {
    if (lastDate.current !== date) { lastDate.current = date; setDraft(state.journal[date] ?? BLANK); setConfirmDel(false); }
  }, [date, state.journal]);

  const keys = Object.keys(state.journal).sort();
  const entries = keys.slice(-30).map((k) => ({ k, ...state.journal[k] }));

  return (
    <>
      <div className="section-head">
        <h2>Nhật ký da</h2>
        <p>Mỗi tối chấm 1–5 cho bốn dấu hiệu (1 là ổn nhất). Ghi đều 8–12 tuần sẽ thấy rõ đâu là đẩy mụn, đâu là kích ứng.</p>
      </div>
      <div className="card stack-gap journal">
        {METRICS.map((m) => {
          const v = (draft as any)[m.key] as number;
          return (
            <div className="jrow" key={m.key}>
              <label htmlFor={`j-${m.key}`}>{m.label}</label>
              <input id={`j-${m.key}`} type="range" min={1} max={5} step={1} value={v}
                style={{ ["--pct" as any]: `${((v - 1) / 4) * 100}%`, ["--c" as any]: m.color }}
                onChange={(e) => setDraft({ ...draft, [m.key]: +e.target.value })} />
              <span className="val">{v}/5</span>
            </div>
          );
        })}
        <textarea id="j-note" value={draft.note} placeholder="Ghi chú ngắn: đổi sản phẩm gì, da có gì lạ…"
          onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        <div className="row-btns">
          <input id="j-date" className="date-input" type="date" value={date} max={dateKey()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button className="pill" onClick={() => mutate("nhật ký", () => api("/api/journal", "PUT", { date, ...draft })).then((ok) => ok && toast("Đã lưu nhật ký"))}>Lưu</button>
          {state.journal[date] && (confirmDel
            ? <button className="pill danger" onClick={() => mutate("nhật ký", () => api(`/api/journal?date=${date}`, "DELETE"))}>Chắc chắn xoá</button>
            : <button className="pill soft" onClick={() => setConfirmDel(true)}>Xoá</button>)}
        </div>
        {state.journal[date] && <div className="small">Đã có ghi chép cho ngày này.</div>}
      </div>
      <JournalChart entries={entries} />
    </>
  );
}

function JournalChart({ entries }: { entries: any[] }) {
  if (entries.length < 2) return <div className="card empty">Cần ít nhất 2 ngày ghi nhật ký để vẽ biểu đồ xu hướng.</div>;
  const W = 340, H = 180, padL = 22, padR = 10, padT = 12, padB = 26;
  const x = (i: number) => padL + (i * (W - padL - padR)) / (entries.length - 1);
  const y = (v: number) => padT + ((5 - v) / 4) * (H - padT - padB);
  const fmt = (k: string) => { const d = parseKey(k); return `${d.getDate()}/${d.getMonth() + 1}`; };
  return (
    <div className="card stack-gap">
      <div className="legend-row">
        {METRICS.map((m) => <span key={m.key}><i style={{ background: m.color }} />{m.label}</span>)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ nhật ký da" className="jchart">
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="#EADFC8" strokeWidth={1} />
            <text x={4} y={y(v) + 4} fontSize={10} fill="#8C949C">{v}</text>
          </g>
        ))}
        {METRICS.map((m) => (
          <g key={m.key}>
            <polyline fill="none" stroke={m.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
              points={entries.map((e, i) => `${x(i)},${y(e[m.key] || 1)}`).join(" ")} />
            <circle cx={x(entries.length - 1)} cy={y(entries[entries.length - 1][m.key] || 1)} r={3.2} fill={m.color} />
          </g>
        ))}
        <text x={padL} y={H - 8} fontSize={10} fill="#8C949C">{fmt(entries[0].k)}</text>
        <text x={W - padR} y={H - 8} fontSize={10} fill="#8C949C" textAnchor="end">{fmt(entries[entries.length - 1].k)}</text>
      </svg>
      <div className="small">1 = ổn nhất · 5 = nặng nhất · {entries.length} ngày gần nhất có ghi chép</div>
    </div>
  );
}
