"use client";
/** Thấy da tiến bộ: ảnh tiến triển (chỉ lưu trên máy), nhận xét từ dữ liệu, và khu vườn da. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { dateKey, parseKey } from "@/lib/dates";
import { dayStat } from "@/lib/habits";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { insights } from "@/lib/insights";
import { addPhoto, deletePhoto, listPhotos, type Photo } from "@/lib/photos";
import { SKIN_BY_KEY } from "@/lib/skin";
import type { State } from "@/lib/types";

/* ================= ẢNH TIẾN TRIỂN ================= */
type Shown = Photo & { url: string };

export function ProgressPhotos() {
  const { tr } = useI18n();
  const [photos, setPhotos] = useState<Shown[] | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [slot, setSlot] = useState<"before" | "after">("after");
  const [mode, setMode] = useState<"slider" | "side">("slider");
  const [pos, setPos] = useState(50);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const list = await listPhotos();
      setPhotos((old) => { old?.forEach((p) => URL.revokeObjectURL(p.url)); return list.map((p) => ({ ...p, url: URL.createObjectURL(p.blob) })); });
      if (list.length) {
        setBefore((b) => (b && list.some((p) => p.id === b) ? b : list[0].id));
        setAfter((a) => (a && list.some((p) => p.id === a) ? a : list[list.length - 1].id));
      }
    } catch { setErr(tr("Trình duyệt này không lưu được ảnh.", "This browser can't store photos.")); setPhotos([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => photos?.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const p = await addPhoto(f, dateKey());
      haptic("success");
      setAfter(p.id);
      await load();
    } catch { setErr(tr("Không đọc được ảnh này.", "Couldn't read that photo.")); }
  };

  const first = photos?.[0];
  const weekNo = (p: Photo) => first ? Math.floor((parseKey(p.date).getTime() - parseKey(first.date).getTime()) / (7 * 86400000)) + 1 : 1;
  const fmt = (p: Photo) => { const d = parseKey(p.date); return `${d.getDate()}/${d.getMonth() + 1}`; };
  const A = photos?.find((p) => p.id === before);
  const B = photos?.find((p) => p.id === after);
  const gap = A && B ? Math.round((parseKey(B.date).getTime() - parseKey(A.date).getTime()) / 86400000) : 0;

  return (
    <div className="card glass stack-gap photos">
      <div className="row-between">
        <div><div className="label">{tr("Ảnh tiến triển", "Progress photos")}</div><div className="h3">{tr("Trước & sau", "Before & after")}</div></div>
        <button className="pill sm" onClick={() => { haptic(); fileRef.current?.click(); }}>＋ {tr("Chụp ảnh", "Add photo")}</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>

      {photos === null ? <div className="empty">…</div> : photos.length === 0 ? (
        <div className="ph-empty">
          <div className="ph-frame" aria-hidden="true"><span>📸</span></div>
          <p className="small">{tr("Chụp một ảnh mặt mộc mỗi tuần, cùng chỗ, cùng ánh sáng. Sau vài tuần bạn sẽ so sánh được bằng thanh trượt.",
            "Take a bare-face photo each week, same spot, same light. After a few weeks you can compare them with a slider.")}</p>
        </div>
      ) : (
        <>
          {A && B && A.id !== B.id ? (
            <>
              <div className="seg small" role="group">
                <button aria-pressed={mode === "slider"} onClick={() => { haptic(); setMode("slider"); }}>{tr("Thanh trượt", "Slider")}</button>
                <button aria-pressed={mode === "side"} onClick={() => { haptic(); setMode("side"); }}>{tr("Cạnh nhau", "Side by side")}</button>
              </div>
              {mode === "slider" ? (
                <div className="cmp" style={{ aspectRatio: `${B.w} / ${B.h}` }}>
                  <img src={B.url} alt={tr("Ảnh sau", "After")} />
                  <img src={A.url} alt={tr("Ảnh trước", "Before")} className="cmp-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
                  <div className="cmp-line" style={{ left: `${pos}%` }}><span>⟷</span></div>
                  <span className="cmp-tag l">{tr("Tuần", "Week")} {weekNo(A)}</span>
                  <span className="cmp-tag r">{tr("Tuần", "Week")} {weekNo(B)}</span>
                  <input type="range" min={0} max={100} value={pos} aria-label={tr("Kéo để so sánh", "Drag to compare")}
                    onChange={(e) => { const v = +e.target.value; if (Math.abs(v - 50) < 1.5 && Math.abs(pos - 50) >= 1.5) haptic(); setPos(v); }} />
                </div>
              ) : (
                <div className="cmp-side">
                  <figure><img src={A.url} alt="" /><figcaption>{tr("Tuần", "Week")} {weekNo(A)} · {fmt(A)}</figcaption></figure>
                  <figure><img src={B.url} alt="" /><figcaption>{tr("Tuần", "Week")} {weekNo(B)} · {fmt(B)}</figcaption></figure>
                </div>
              )}
              <p className="small center">{tr(`Cách nhau ${gap} ngày`, `${gap} days apart`)}{gap >= 14 ? tr(` · khoảng ${Math.round(gap / 7)} tuần`, ` · about ${Math.round(gap / 7)} weeks`) : ""}</p>
            </>
          ) : (
            <p className="small">{tr("Thêm một ảnh nữa vào tuần sau để bắt đầu so sánh.", "Add another photo next week to start comparing.")}</p>
          )}

          <div className="row-between">
            <div className="seg small slotseg" role="group" aria-label={tr("Đang chọn ảnh", "Choosing")}>
              <button aria-pressed={slot === "before"} onClick={() => setSlot("before")}>{tr("Chọn ảnh trước", "Pick before")}</button>
              <button aria-pressed={slot === "after"} onClick={() => setSlot("after")}>{tr("Chọn ảnh sau", "Pick after")}</button>
            </div>
            <button className="linkbtn" onClick={() => setEditing(!editing)}>{editing ? tr("Xong", "Done") : tr("Sửa", "Edit")}</button>
          </div>
          <div className="ph-strip">
            {photos.map((p) => (
              <div key={p.id} className={`ph ${p.id === before ? "is-a" : ""} ${p.id === after ? "is-b" : ""}`}>
                <button onClick={() => { haptic(); slot === "before" ? setBefore(p.id) : setAfter(p.id); }}>
                  <img src={p.url} alt="" /><small>{tr("T", "W")}{weekNo(p)} · {fmt(p)}</small>
                </button>
                {editing && <button className="ph-del" aria-label={tr("Xoá ảnh", "Delete photo")} onClick={async () => {
                  if (!confirm(tr("Xoá ảnh này khỏi máy?", "Delete this photo from this device?"))) return;
                  await deletePhoto(p.id); haptic("warn"); load();
                }}>×</button>}
              </div>
            ))}
          </div>
        </>
      )}
      {err && <p className="small err-text">{err}</p>}
      <p className="privacy">🔒 {tr("Ảnh chỉ lưu trên thiết bị này, không tải lên đâu cả. Xoá dữ liệu Safari sẽ xoá luôn ảnh.", "Photos stay on this device and are never uploaded. Clearing Safari data deletes them.")}</p>
    </div>
  );
}

/* ================= NHẬN XÉT TỪ DỮ LIỆU ================= */
export function InsightsCard({ state }: { state: State }) {
  const { tr, lang } = useI18n();
  const { list, logged, need } = useMemo(() => insights(state), [state]);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="card glass stack-gap insights">
      <div><div className="label">{tr("Niks để ý thấy", "Niks noticed")}</div><div className="h3">{tr("Mối liên hệ của bạn", "Your patterns")}</div></div>
      {list.length === 0 ? (
        <div className="ins-wait">
          <p className="small">{logged < need
            ? tr(`Ghi nhật ký da thêm ${need - logged} ngày nữa để Niks tìm ra quy luật.`, `Log your skin ${need - logged} more day${need - logged > 1 ? "s" : ""} so Niks can spot patterns.`)
            : tr("Chưa thấy quy luật rõ ràng. Cứ ghi đều nhé, Niks đang theo dõi.", "No clear patterns yet. Keep logging, Niks is watching.")}</p>
          <span className="bar"><i style={{ width: `${Math.min(100, (logged / need) * 100)}%`, background: "var(--sage)" }} /></span>
        </div>
      ) : (
        <ul className="ins-list">
          {list.map((x, i) => (
            <li key={x.id} className={`ins ${x.tone}`} style={{ ["--d" as any]: i }}>
              <button onClick={() => { haptic(); setOpen(open === x.id ? null : x.id); }} aria-expanded={open === x.id}>
                <span className="ins-ic">{x.icon}</span>
                <span className="grow"><b>{lang === "en" ? x.en : x.vi}</b>
                  {open === x.id && <small>{lang === "en" ? x.detailEn : x.detailVi}</small>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="small muted-note">{tr("Đây là tương quan từ nhật ký của bạn, chưa chắc là nguyên nhân.", "These are correlations from your logs, not proof of cause.")}</p>
    </div>
  );
}

/* ================= KHU VƯỜN DA ================= */
type Plant = "bloom" | "bud" | "sprout" | "none" | "future" | "seed";

function plantFor(state: State, key: string, today: string): { kind: Plant; tall: boolean; color: string } {
  if (key > today) return { kind: "future", tall: false, color: "" };
  const skin = state.skin[key]?.tags ?? [];
  const mood = state.moods[key];
  const s = dayStat(state, key);
  const tall = s.planned > 0 && s.ratio >= 0.8;
  if (!skin.length && !mood) return { kind: key === today ? "seed" : "none", tall: false, color: "" };
  if (!skin.length) return { kind: "sprout", tall, color: "" };
  const good = skin.some((t) => SKIN_BY_KEY[t]?.good) && !skin.some((t) => SKIN_BY_KEY[t] && !SKIN_BY_KEY[t].good);
  const color = SKIN_BY_KEY[skin[0]]?.color ?? "#F7C8D3";
  return { kind: good ? "bloom" : "bud", tall, color: good ? (skin.includes("glowy") ? "#F2C879" : "#F7C8D3") : color };
}

function PlantSvg({ kind, tall, color }: { kind: Plant; tall: boolean; color: string }) {
  const top = tall ? 8 : 16;
  if (kind === "future") return <svg viewBox="0 0 40 52" aria-hidden="true"><ellipse cx="20" cy="47" rx="12" ry="3.5" fill="#E9DCC2" opacity=".55" /></svg>;
  if (kind === "none") return <svg viewBox="0 0 40 52" aria-hidden="true"><ellipse cx="20" cy="47" rx="12" ry="4" fill="#D9C7A6" /></svg>;
  if (kind === "seed") return <svg viewBox="0 0 40 52" aria-hidden="true"><ellipse cx="20" cy="47" rx="12" ry="4" fill="#D9C7A6" /><ellipse cx="20" cy="42" rx="3" ry="4" fill="none" stroke="#B48C64" strokeWidth="1.4" strokeDasharray="2 2" /></svg>;
  return (
    <svg viewBox="0 0 40 52" aria-hidden="true">
      <ellipse cx="20" cy="47" rx="12" ry="4" fill="#C9B08A" />
      <g className="plant">
        <path d={`M20 46V${top + 8}`} stroke="#7E9460" strokeWidth="2.4" strokeLinecap="round" />
        <path d={`M20 ${tall ? 34 : 38}c-7 0-10-5-10-9 6 0 10 3 10 9z`} fill="#A8B58A" />
        {kind !== "sprout" && <path d={`M20 ${tall ? 28 : 33}c7 0 10-5 10-9-6 0-10 3-10 9z`} fill="#BCC7A2" />}
        {kind === "sprout" && <path d={`M20 ${top + 8}c5-1 8-5 8-9-5 0-8 4-8 9z`} fill="#BCC7A2" />}
        {kind === "bud" && <path d={`M20 ${top + 9}c-5-1-6-7-3-11 1 2 2 2 3 0 1 2 2 2 3 0 3 4 2 10-3 11z`} fill={color} />}
        {kind === "bloom" && <g transform={`translate(20 ${top + 3})`}>
          {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-6" rx="4.6" ry="6.4" fill={color} transform={`rotate(${r})`} />)}
          <circle r="3.6" fill="#FFF7E6" /><circle r="2" fill="#F2B84B" />
        </g>}
        {tall && kind === "bloom" && <path className="sparkle" d="M33 6l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill="#F2B84B" />}
      </g>
    </svg>
  );
}

export function SkinGarden({ state, compact }: { state: State; compact?: boolean }) {
  const { tr, L } = useI18n();
  const today = dateKey();
  const days = useMemo(() => {
    // 4 tuần gần nhất, bắt đầu từ thứ Hai
    const end = new Date();
    const start = new Date(end); start.setDate(start.getDate() - ((end.getDay() + 6) % 7) - 21);
    return Array.from({ length: 28 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return dateKey(d); });
  }, [today]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = useMemo(() => new Set([...Object.keys(state.skin).filter((k) => state.skin[k].tags.length), ...Object.keys(state.moods)]).size, [state.skin, state.moods]);
  const plants = days.map((k) => ({ k, ...plantFor(state, k, today) }));
  const grown = plants.filter((p) => ["bloom", "bud", "sprout"].includes(p.kind)).length;
  const blooms = plants.filter((p) => p.kind === "bloom").length;
  const level = total >= 60 ? [tr("Khu vườn cổ tích", "Fairy-tale garden"), "🏡"] : total >= 30 ? [tr("Vườn hoa rực rỡ", "Blooming garden"), "🌷"] : total >= 10 ? [tr("Vườn đang lớn", "Growing garden"), "🌿"] : [tr("Mầm non", "Little seedlings"), "🌱"];
  return (
    <div className={`card garden ${compact ? "compact" : ""}`}>
      <div className="row-between">
        <div><div className="label">{tr("Khu vườn da", "Skin garden")} · {level[1]} {level[0]}</div>
          <div className="h3">{tr(`${grown} cây trong 4 tuần`, `${grown} plant${grown === 1 ? "" : "s"} in 4 weeks`)}</div></div>
        <div className="g-count"><b>{total}</b><span>{tr("ngày đã ghi", "days logged")}</span></div>
      </div>
      <div className="g-dow">{L.dow.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="g-bed">
        {plants.map((p, i) => (
          <div key={p.k} className={`g-cell ${p.k === today ? "today" : ""} k-${p.kind}`} style={{ ["--d" as any]: i }} title={p.k}>
            <PlantSvg kind={p.kind} tall={p.tall} color={p.color} />
          </div>
        ))}
      </div>
      <p className="small">{tr("Mỗi ngày ghi nhật ký da hoặc cảm xúc là một cây mới. Da đẹp thì cây nở hoa, làm đủ routine thì cây cao hơn.",
        "Every day you log your skin or mood plants something new. Happy skin blooms, and a full routine makes it grow taller.")}
        {blooms > 0 && tr(` ${blooms} bông đã nở 🌸`, ` ${blooms} in bloom 🌸`)}</p>
    </div>
  );
}
