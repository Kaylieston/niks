"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Scope } from "@/lib/defaults";
import { dateKey } from "@/lib/dates";
import { GOOD_DAY, dayStat, daysBetween, productUse, quarterOf, streak as calcStreak, type DayStat } from "@/lib/habits";
import { useI18n } from "@/lib/i18n";
import type { State } from "@/lib/types";
import { G, ProductArt, productLook } from "./art";
import { SkinStats } from "./Skin";
import { InsightsCard, ProgressPhotos, SkinGarden } from "./Growth";

export type Period = "day" | "month" | "quarter";
const SCOPES: Scope[] = ["face", "hair", "body"];
const SCOPE_TONE: Record<Scope, string> = { face: "var(--rose)", hair: "#8E7FA6", body: "#7E9460" };

/** Khoảng ngày của kỳ đang xem (không vượt quá hôm nay) */
export function periodDays(period: Period, anchor: Date) {
  const today = new Date();
  let from: Date, to: Date;
  if (period === "day") { from = anchor; to = anchor; }
  else if (period === "month") { from = new Date(anchor.getFullYear(), anchor.getMonth(), 1); to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0); }
  else [from, to] = quarterOf(anchor);
  return { from, to, keys: daysBetween(from, to < today ? to : today) };
}

export default function ProgressView({ state }: { state: State }) {
  const { tr, L, lang } = useI18n();
  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const { from, keys } = periodDays(period, anchor);
  const stats = useMemo(() => keys.map((k) => dayStat(state, k)), [state, keys.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const withPlan = stats.filter((s) => s.planned);
  const planned = withPlan.reduce((n, s) => n + s.planned, 0);
  const done = withPlan.reduce((n, s) => n + s.done, 0);
  const score = planned ? Math.round((done / planned) * 100) : 0;
  const goodDays = withPlan.filter((s) => s.ratio >= GOOD_DAY).length;
  const streak = useMemo(() => calcStreak(state), [state]);
  const use = useMemo(() => productUse(state, keys), [state, keys.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = useMemo(() => Object.fromEntries(state.products.map((p) => [p.id, p])), [state.products]);
  const top = Object.entries(use).filter(([id]) => byId[id]).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const shift = (n: number) => {
    const d = new Date(anchor);
    if (period === "day") d.setDate(d.getDate() + n);
    else if (period === "month") { d.setDate(1); d.setMonth(d.getMonth() + n); }
    else { d.setDate(1); d.setMonth(d.getMonth() + 3 * n); }
    setAnchor(d);
  };
  const atNow = period === "day" ? dateKey(anchor) === dateKey()
    : period === "month" ? anchor.getFullYear() === new Date().getFullYear() && anchor.getMonth() === new Date().getMonth()
    : quarterOf(anchor)[0].getTime() === quarterOf(new Date())[0].getTime();
  const label = period === "day"
    ? (atNow ? tr("Hôm nay", "Today") : L.dateLong(anchor))
    : period === "month" ? `${L.month(from.getMonth())} ${from.getFullYear()}`
    : tr(`Quý ${Math.floor(from.getMonth() / 3) + 1}, ${from.getFullYear()}`, `Q${Math.floor(from.getMonth() / 3) + 1} ${from.getFullYear()}`);

  const mood = score >= 85 ? tr("Da đang được chăm rất đều, tuyệt quá!", "Your routine is on point, amazing!")
    : score >= 60 ? tr("Đều đặn lắm rồi, cố thêm chút nữa nhé!", "Nicely consistent, just a little more!")
    : planned && done ? tr("Mỗi bước nhỏ đều có ích, tiếp tục nha!", "Every small step counts, keep going!")
    : tr("Tick các bước ở tab Lịch trình để bắt đầu theo dõi.", "Tick steps in the Routine tab to start tracking.");

  return (
    <section className="view progress">
      <div className="top">
        <div className="grow">
          <div className="sub">{tr("Thói quen chăm da", "Skincare habits")}</div>
          <h1 className="swash">{tr("Tiến độ", "My progress")}</h1>
        </div>
      </div>

      <div className="seg glass" role="group" aria-label={tr("Khoảng thời gian", "Period")}>
        {(["day", "month", "quarter"] as Period[]).map((p) => (
          <button key={p} aria-pressed={period === p} onClick={() => { setPeriod(p); setAnchor(new Date()); }}>
            {p === "day" ? tr("Ngày", "Day") : p === "month" ? tr("Tháng", "Month") : tr("Quý", "Quarter")}
          </button>
        ))}
      </div>

      <div className="pnav">
        <button className="iconbtn sm" aria-label={tr("Trước", "Previous")} onClick={() => shift(-1)}><G name="prev" size={18} width={2.5} /></button>
        <b>{label}</b>
        <button className="iconbtn sm" aria-label={tr("Sau", "Next")} disabled={atNow} onClick={() => shift(1)}><G name="next" size={18} width={2.5} /></button>
      </div>

      <div className="card glass score">
        <div className="score-top">
          <div>
            <div className="label">{tr("Điểm thói quen", "Habit score")}</div>
            <div className="big-score"><b>{score}</b><span>/100</span></div>
            <p>{mood}</p>
          </div>
          <img className="score-cat" src="/icons/cat-avatar.png" alt="" />
          <span className="spark s1">✦</span><span className="spark s2">✦</span>
        </div>
        {period === "day" ? <DayBreakdown s={stats[0]} /> : <TrendChart stats={stats} period={period} lang={lang} />}
      </div>

      <div className="tiles">
        <div className="tile glass"><b>{goodDays}<small>/{withPlan.length}</small></b><span>{tr("ngày đạt ≥ 80%", "days ≥ 80%")}</span></div>
        <div className="tile glass"><b>{done}</b><span>{tr("bước đã làm", "steps done")}</span></div>
        <div className="tile glass"><b>{streak}</b><span>{tr("ngày liên tiếp", "day streak")}</span></div>
      </div>

      <SkinGarden state={state} />

      <InsightsCard state={state} />

      <ProgressPhotos />

      <div className="card glass stack-gap">
        <div className="row-between"><div className="h3">{tr("Theo từng mục", "By area")}</div></div>
        <ul className="areas">
          {SCOPES.map((sc) => {
            const [d, p] = withPlan.reduce((a, s) => [a[0] + s.byScope[sc][0], a[1] + s.byScope[sc][1]], [0, 0]);
            if (!p) return null;
            const pct = Math.round((d / p) * 100);
            return (
              <li key={sc}>
                <span className="area-ic" style={{ background: SCOPE_TONE[sc] + "22", color: SCOPE_TONE[sc] }}>
                  <ProductArt group={sc === "face" ? "Serum" : sc === "hair" ? "Dầu gội" : "Kem dưỡng"} size={30} />
                </span>
                <span className="grow">
                  <span className="row-between"><b>{L.scope[sc]}</b><em style={{ color: SCOPE_TONE[sc] }}>{pct}%</em></span>
                  <span className="small">{tr(`${d}/${p} bước`, `${d}/${p} steps`)}</span>
                  <Bar pct={pct} color={SCOPE_TONE[sc]} />
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card glass stack-gap">
        <div className="h3">{tr("Dùng nhiều nhất", "Most used")}</div>
        {top.length === 0 ? <div className="empty">{tr("Chưa có bước nào được tick trong kỳ này.", "No steps ticked in this period yet.")}</div> : (
          <ul className="areas">
            {top.map(([id, n]) => {
              const p = byId[id];
              return (
                <li key={id}>
                  <span className="area-ic" style={{ background: productLook(p.group).bg }}><ProductArt group={p.group} size={30} /></span>
                  <span className="grow">
                    <span className="row-between"><b className="ell">{p.name}</b><em>{tr(`${n} lần`, `${n}×`)}</em></span>
                    <span className="small">{L.group(p.group)}</span>
                    <Bar pct={(n / top[0][1]) * 100} color="var(--blush)" />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SkinStats state={state} keys={keys} title={label} />

      <div className="card streak-card">
        <div>
          <div className="h3">{streak > 0
            ? <><span className="accent">{tr(`${streak} ngày`, `${streak} day${streak > 1 ? "s" : ""}`)}</span>{tr(" liên tiếp!", " in a row!")} 🎉</>
            : tr("Bắt đầu chuỗi ngày mới nào!", "Start a new streak today!")}</div>
          <p>{tr("Đều đặn chính là bí quyết của làn da khoẻ ✨", "Consistency is the secret to happy skin ✨")}</p>
        </div>
        <div className="streak-art"><ProductArt group="Toner" size={58} /><ProductArt group="Serum" size={46} /></div>
      </div>
    </section>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => requestAnimationFrame(() => setW(pct))); return () => cancelAnimationFrame(t); }, [pct]);
  return <span className="bar"><i style={{ width: `${w}%`, background: color }} /></span>;
}

/** Ngày: từng mục đã xong bao nhiêu */
function DayBreakdown({ s }: { s?: DayStat }) {
  const { tr, L } = useI18n();
  if (!s?.planned) return <div className="empty">{tr("Ngày này không có bước nào trong lịch.", "No steps planned for this day.")}</div>;
  return (
    <div className="daybars">
      {SCOPES.filter((sc) => s.byScope[sc][1]).map((sc) => {
        const [d, p] = s.byScope[sc];
        return (
          <div key={sc} className="db">
            <div className="db-col"><i style={{ height: `${Math.max(6, (d / p) * 100)}%`, background: SCOPE_TONE[sc] }} /></div>
            <b>{d}/{p}</b><span>{L.scope[sc]}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Tháng: đường theo ngày · Quý: đường theo tuần */
function TrendChart({ stats, period, lang }: { stats: DayStat[]; period: Period; lang: string }) {
  const pts = useMemo(() => {
    if (period === "month") return stats.map((s) => ({ v: s.planned ? s.ratio : null, label: String(+s.key.slice(8)) }));
    const weeks: { v: number | null; label: string }[] = [];
    for (let i = 0; i < stats.length; i += 7) {
      const chunk = stats.slice(i, i + 7).filter((s) => s.planned);
      const p = chunk.reduce((n, s) => n + s.planned, 0), d = chunk.reduce((n, s) => n + s.done, 0);
      weeks.push({ v: p ? d / p : null, label: (lang === "en" ? "Wk " : "Tuần ") + (weeks.length + 1) });
    }
    return weeks;
  }, [stats, period, lang]);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { setDrawn(false); const t = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true))); return () => cancelAnimationFrame(t); }, [pts]);
  if (pts.length < 2) return <div className="empty">{lang === "en" ? "Come back tomorrow to see your trend." : "Quay lại ngày mai để xem xu hướng nhé."}</div>;

  const W = 320, H = 130, pl = 6, pr = 12, pt = 10, pb = 22;
  const x = (i: number) => pl + (i * (W - pl - pr)) / (pts.length - 1);
  const y = (v: number) => pt + (1 - v) * (H - pt - pb);
  const real = pts.map((p, i) => ({ ...p, i })).filter((p) => p.v !== null) as { v: number; label: string; i: number }[];
  const line = real.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = real.length > 1 ? `M${x(real[0].i)},${H - pb} L${line.replace(/ /g, " L")} L${x(real[real.length - 1].i)},${H - pb}Z` : "";
  const every = period === "quarter" ? (pts.length > 7 ? 3 : 2) : pts.length > 20 ? 5 : pts.length > 10 ? 2 : 1;
  const last = real[real.length - 1];
  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="trend">
      <defs>
        <linearGradient id="trendfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EFA9BA" stopOpacity=".45" /><stop offset="1" stopColor="#EFA9BA" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.5, 1].map((v) => <line key={v} x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="#F1D9DE" strokeDasharray="3 4" />)}
      {area && <path d={area} fill="url(#trendfill)" className={`t-area ${drawn ? "on" : ""}`} />}
      {real.length > 1 && <polyline points={line} fill="none" stroke="#D9737F" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"
        pathLength={1} className={`t-line ${drawn ? "on" : ""}`} />}
      {real.map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={pts.length > 20 ? 2.2 : 3.6} fill="#fff" stroke="#D9737F" strokeWidth="2" />)}
      {last && <circle cx={x(last.i)} cy={y(last.v)} r={5.5} fill="#D9737F" className="t-last" />}
      {pts.map((p, i) => (i % every === 0 || (i === pts.length - 1 && i % every >= every / 2 + 0.5)) && (
        <text key={i} x={x(i)} y={H - 6} fontSize="10" textAnchor="middle" fill="#8C949C">{p.label}</text>
      ))}
    </svg>
  );
}
