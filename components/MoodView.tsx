"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { dateKey, parseKey } from "@/lib/dates";
import { dayStat, daysBetween, streak as calcStreak } from "@/lib/habits";
import { useI18n } from "@/lib/i18n";
import { MOODS, MOOD_BY_KEY, moodName } from "@/lib/moods";
import type { Mutate, State } from "@/lib/types";
import { G, MoodBlob } from "./art";
import { Ring, api } from "./ui";
import { SkinStats } from "./Skin";

type Range = "week" | "month" | "all";
const OTHER = "#E6DCC8";

export default function MoodView({ state, mutate, preselect, clearPreselect, toast, goProgress }: {
  state: State; mutate: Mutate; preselect: string | null; clearPreselect: () => void; toast: (m: string) => void; goProgress: () => void;
}) {
  const { tr, lang } = useI18n();
  const [date, setDate] = useState(dateKey());
  const existing = state.moods[date];
  const [pick, setPick] = useState<string | null>(preselect ?? existing?.mood ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [range, setRange] = useState<Range>("month");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const lastDate = useRef(date);

  useEffect(() => { if (preselect) { setPick(preselect); clearPreselect(); } }, [preselect, clearPreselect]);
  useEffect(() => {
    if (lastDate.current === date) return;
    lastDate.current = date;
    const e = state.moods[date];
    setPick(e?.mood ?? null); setNote(e?.note ?? "");
  }, [date, state.moods]);

  const save = () => {
    if (!pick) { toast(tr("Chọn một cảm xúc trước nhé", "Pick a mood first")); return; }
    mutate(tr("cảm xúc", "mood"), () => api("/api/mood", "PUT", { date, mood: pick, note }))
      .then((ok) => ok && toast(`${tr("Đã lưu", "Saved")}: ${moodName(pick, lang)}`));
  };

  const d = parseKey(date);
  const isToday = date === dateKey();

  return (
    <section className="view">
      <div className="top">
        <div className="grow"><div className="sub">{isToday ? tr("Hôm nay", "Today") : `${d.getDate()}/${d.getMonth() + 1}`}</div><h1>{tr("Cảm xúc", "Mood")}</h1></div>
        <label className="iconbtn date-btn" aria-label={tr("Chọn ngày", "Pick a date")}>
          <input type="date" value={date} max={dateKey()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <span>{d.getDate()}/{d.getMonth() + 1}</span>
        </label>
      </div>

      <div className="card">
        <div className="h3 center">{tr("Lúc này, bạn thấy thế nào?", "How are you feeling right now?")}</div>
        <div className="moodgrid">
          {MOODS.map((m) => (
            <button key={m.key} className="mb" aria-pressed={pick === m.key} onClick={() => setPick(m.key)}>
              <MoodBlob mood={m.key} size={54} />{moodName(m.key, lang)}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack-gap">
        <textarea id="mood-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Ghi chú ngắn (không bắt buộc)", "A short note (optional)")} />
        <div className="row-btns">
          <button className="pill wide" onClick={save}>{existing ? tr("Cập nhật", "Update") : tr("Lưu cảm xúc", "Save mood")}</button>
          {existing && (
            <button className="pill soft" onClick={() => mutate(tr("cảm xúc", "mood"), () => api(`/api/mood?date=${date}`, "DELETE"))
              .then((ok) => { if (ok) { setPick(null); setNote(""); toast(tr("Đã xoá", "Deleted")); } })}>{tr("Xoá", "Delete")}</button>
          )}
        </div>
      </div>

      <MoodStats moods={state.moods} range={range} setRange={setRange} />
      <MoodCalendar moods={state.moods} month={month} setMonth={setMonth} onPick={setDate} selected={date} />

      <div className="section-head">
        <h2>{tr("Thói quen & làn da", "Habits & skin")}</h2>
        <p>{range === "week" ? tr("7 ngày qua", "Last 7 days") : range === "month" ? tr("Tháng này", "This month") : tr("Từ trước tới nay", "All time")}</p>
      </div>
      <HabitSummary state={state} keys={rangeKeys(state, range)} goProgress={goProgress} />
      <SkinStats state={state} keys={rangeKeys(state, range)} />
    </section>
  );
}

/** Các ngày trong khoảng đang xem (tuần / tháng / tất cả), tới hôm nay */
function rangeKeys(state: State, range: Range) {
  const now = new Date();
  if (range === "week") { const f = new Date(); f.setDate(f.getDate() - 6); return daysBetween(f, now); }
  if (range === "month") return daysBetween(new Date(now.getFullYear(), now.getMonth(), 1), now);
  const first = [...Object.keys(state.checks), ...Object.keys(state.skin)].sort()[0];
  return first ? daysBetween(parseKey(first), now) : [dateKey(now)];
}

/** Tóm tắt thói quen chăm da trong khoảng đang xem */
function HabitSummary({ state, keys, goProgress }: { state: State; keys: string[]; goProgress: () => void }) {
  const { tr } = useI18n();
  const { pct, good, days } = useMemo(() => {
    const st = keys.map((k) => dayStat(state, k)).filter((s) => s.planned);
    const p = st.reduce((n, s) => n + s.planned, 0), d = st.reduce((n, s) => n + s.done, 0);
    return { pct: p ? d / p : 0, good: st.filter((s) => s.ratio >= 0.8).length, days: st.length };
  }, [state, keys]);
  const streak = useMemo(() => calcStreak(state), [state]);
  return (
    <button className="card habit-sum" onClick={goProgress}>
      <span className="hs-ring"><Ring value={pct} size={64} color="var(--sage)" /><b>{Math.round(pct * 100)}%</b></span>
      <span className="grow">
        <span className="label">{tr("Thói quen chăm da", "Skincare habit")}</span>
        <span className="h3">{tr(`${good}/${days} ngày đạt từ 80%`, `${good}/${days} days at 80%+`)}</span>
        <span className="small">{tr(`Chuỗi hiện tại: ${streak} ngày · xem chi tiết`, `Current streak: ${streak} day${streak === 1 ? "" : "s"} · see details`)}</span>
      </span>
      <G name="next" size={18} width={2.5} />
    </button>
  );
}

function MoodStats({ moods, range, setRange }: { moods: State["moods"]; range: Range; setRange: (r: Range) => void }) {
  const { tr, L, lang } = useI18n();
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
    const title = range === "week" ? tr("7 ngày qua", "Last 7 days") : range === "month" ? L.month(now.getMonth()) : tr("Từ trước tới nay", "All time");
    return { rows, total: keys.length, title };
  }, [moods, range, tr, L]);

  const R = 56, C = 2 * Math.PI * R, GAP = rows.length > 1 ? 3 : 0;
  const [grow, setGrow] = useState(false);
  useEffect(() => { setGrow(false); const t = requestAnimationFrame(() => requestAnimationFrame(() => setGrow(true))); return () => cancelAnimationFrame(t); }, [rows]);

  let off = 0;
  return (
    <div className="card stack-gap">
      <div className="row-between">
        <div><div className="label">{tr("Cảm xúc của bạn", "Your moods")}</div><div className="h3">{title}</div></div>
        <div className="seg small" role="group" aria-label={tr("Khoảng thời gian", "Period")}>
          {(["week", "month", "all"] as Range[]).map((r) => (
            <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>{r === "week" ? tr("Tuần", "Week") : r === "month" ? tr("Tháng", "Month") : tr("Tất cả", "All")}</button>
          ))}
        </div>
      </div>
      {total === 0 ? (
        <div className="empty">{tr("Chưa có cảm xúc nào trong khoảng này. Ghi lại hôm nay để bắt đầu biểu đồ.", "No moods logged in this period. Log today to start your chart.")}</div>
      ) : (
        <div className="donutwrap">
          <div className="donut">
            <svg viewBox="0 0 150 150" role="img" aria-label={tr(`Biểu đồ cảm xúc, ${total} ngày`, `Mood chart, ${total} days`)}>
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
              <span>{rows[0][0] === "other" ? tr("Khác", "Other") : moodName(rows[0][0], lang)}</span>
            </div>
          </div>
          <ul className="legend">
            {rows.map(([k, v]) => (
              <li key={k}><i style={{ background: k === "other" ? OTHER : MOOD_BY_KEY[k]?.color }} />
                {k === "other" ? tr("Khác", "Other") : moodName(k, lang)}<em>{Math.round((v / total) * 100)}%</em></li>
            ))}
            <li className="small">{tr(`${total} ngày đã ghi`, `${total} day${total > 1 ? "s" : ""} logged`)}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function MoodCalendar({ moods, month, setMonth, onPick, selected }: {
  moods: State["moods"]; month: Date; setMonth: (d: Date) => void; onPick: (k: string) => void; selected: string;
}) {
  const { tr, L, lang } = useI18n();
  const y = month.getFullYear(), m = month.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysIn = new Date(y, m + 1, 0).getDate();
  const today = dateKey();
  const isCurrent = y === new Date().getFullYear() && m === new Date().getMonth();
  return (
    <div className="card stack-gap">
      <div className="row-between">
        <div className="h3">{L.month(m)}, {y}</div>
        <div className="row-btns tight">
          <button className="iconbtn sm" aria-label={tr("Tháng trước", "Previous month")} onClick={() => setMonth(new Date(y, m - 1, 1))}><G name="prev" size={18} width={2.5} /></button>
          <button className="iconbtn sm" aria-label={tr("Tháng sau", "Next month")} disabled={isCurrent} onClick={() => setMonth(new Date(y, m + 1, 1))}><G name="next" size={18} width={2.5} /></button>
        </div>
      </div>
      <div className="cal">
        {L.dow.map((d) => <div key={d} className="dow">{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysIn }, (_, i) => {
          const k = dateKey(new Date(y, m, i + 1));
          const e = moods[k];
          const future = k > today;
          return (
            <button key={k} className={`d ${k === today ? "today" : ""} ${k === selected ? "sel" : ""}`} disabled={future}
              title={e ? `${i + 1}: ${moodName(e.mood, lang)}` : undefined} onClick={() => onPick(k)}>
              {e ? <MoodBlob mood={e.mood} size={36} /> : i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

