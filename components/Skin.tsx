"use client";

import React, { useEffect, useMemo, useState } from "react";
import { dateKey, parseKey } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { SKIN, SKIN_BY_KEY } from "@/lib/skin";
import type { Mutate, State } from "@/lib/types";
import { SkinFace } from "./art";
import { api } from "./ui";

/** "Da hôm nay thế nào?" — chọn tình trạng da + ghi chú nhỏ cho một ngày */
export function SkinCheck({ state, mutate, date, toast }: { state: State; mutate: Mutate; date: string; toast: (m: string) => void }) {
  const { tr, lang } = useI18n();
  const saved = state.skin[date];
  const [tags, setTags] = useState<string[]>(saved?.tags ?? []);
  const [note, setNote] = useState(saved?.note ?? "");
  useEffect(() => { setTags(state.skin[date]?.tags ?? []); setNote(state.skin[date]?.note ?? ""); }, [date, state.skin]);

  const dirty = (saved?.tags ?? []).join() !== tags.join() || (saved?.note ?? "") !== note;
  const d = parseKey(date);
  const isToday = date === dateKey();
  const save = () => mutate(tr("tình trạng da", "skin log"), () =>
    tags.length || note.trim() ? api("/api/skin", "PUT", { date, tags, note: note.trim() }) : api(`/api/skin?date=${date}`, "DELETE"))
    .then((ok) => ok && toast(tr("Đã lưu tình trạng da", "Skin log saved")));

  return (
    <div className="card skincheck">
      <div className="sc-head">
        <div className="grow">
          <div className="label">{isToday ? tr("Nhật ký da", "Skin diary") : tr(`Ngày ${d.getDate()}/${d.getMonth() + 1}`, `${d.getDate()}/${d.getMonth() + 1}`)}</div>
          <div className="h3">{isToday ? tr("Da hôm nay thế nào?", "How is your skin today?") : tr("Hôm đó da thế nào?", "How was your skin that day?")}</div>
        </div>
        {saved && !dirty && <span className="chip sage">{tr("Đã ghi", "Logged")}</span>}
      </div>
      <div className="skingrid">
        {SKIN.map((s) => {
          const on = tags.includes(s.key);
          return (
            <button key={s.key} className={`sk ${on ? "on" : ""}`} aria-pressed={on} style={{ ["--c" as any]: s.color }}
              onClick={() => setTags(on ? tags.filter((t) => t !== s.key) : [...tags, s.key])}>
              <span className="skf"><SkinFace skin={s.key} size={44} /></span>
              {lang === "en" ? s.en : s.vi}
            </button>
          );
        })}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
        placeholder={tr("Ghi chú nhỏ: ngủ ít, đổi sản phẩm, trời hanh khô…", "A little note: slept late, new product, dry weather…")} />
      <button className="pill wide" disabled={!dirty} onClick={save}>
        {saved ? tr("Cập nhật", "Update") : tr("Lưu tình trạng da", "Save skin log")}
      </button>
    </div>
  );
}

/** Thống kê tình trạng da trong một danh sách ngày */
export function SkinStats({ state, keys, title }: { state: State; keys: string[]; title?: string }) {
  const { tr, lang } = useI18n();
  const { logged, rows, good, recent } = useMemo(() => {
    const logs = keys.filter((k) => state.skin[k]?.tags.length);
    const cnt: Record<string, number> = {};
    let good = 0;
    for (const k of logs) {
      const t = state.skin[k].tags;
      for (const x of t) cnt[x] = (cnt[x] ?? 0) + 1;
      if (t.some((x) => SKIN_BY_KEY[x]?.good) && !t.some((x) => SKIN_BY_KEY[x] && !SKIN_BY_KEY[x].good)) good++;
    }
    const rows = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
    return { logged: logs.length, rows, good, recent: logs.slice(-7) };
  }, [state.skin, keys]);
  const [grow, setGrow] = useState(false);
  useEffect(() => { setGrow(false); const t = requestAnimationFrame(() => requestAnimationFrame(() => setGrow(true))); return () => cancelAnimationFrame(t); }, [rows]);

  return (
    <div className="card glass stack-gap">
      <div className="row-between">
        <div><div className="label">{tr("Tình trạng da", "Skin condition")}</div><div className="h3">{title ?? tr("Da của bạn", "Your skin")}</div></div>
        {logged > 0 && (
          <div className="goodskin"><b>{Math.round((good / logged) * 100)}%</b><span>{tr("ngày da đẹp", "happy-skin days")}</span></div>
        )}
      </div>
      {logged === 0 ? (
        <div className="empty">{tr("Chưa ghi tình trạng da nào trong khoảng này. Ghi ở cuối tab Lịch trình nhé.", "No skin logs in this period yet. Add one at the bottom of the Routine tab.")}</div>
      ) : (
        <>
          <ul className="skinbars">
            {rows.map(([k, v]) => {
              const s = SKIN_BY_KEY[k];
              if (!s) return null;
              return (
                <li key={k}>
                  <span className="skf sm" style={{ background: s.color + "55" }}><SkinFace skin={k} size={34} /></span>
                  <span className="grow">
                    <span className="row-between"><b>{lang === "en" ? s.en : s.vi}</b><em>{tr(`${v} ngày`, `${v} day${v > 1 ? "s" : ""}`)}</em></span>
                    <span className="bar"><i style={{ width: grow ? `${(v / logged) * 100}%` : 0, background: s.good ? "var(--sage)" : "var(--rose)" }} /></span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="recent">
            <span className="small">{tr("Gần đây", "Recent")}</span>
            {recent.map((k) => {
              const d = parseKey(k);
              return (
                <span key={k} className="rd" title={state.skin[k].note || undefined}>
                  <SkinFace skin={state.skin[k].tags[0]} size={30} /><small>{d.getDate()}/{d.getMonth() + 1}</small>
                </span>
              );
            })}
          </div>
          <div className="small">{tr(`${logged} ngày đã ghi`, `${logged} day${logged > 1 ? "s" : ""} logged`)}</div>
        </>
      )}
    </div>
  );
}
