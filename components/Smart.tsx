"use client";
/** Phần "thông minh": trắc nghiệm hồ sơ da, gợi ý riêng, "Tối nay dùng gì?", cảnh báo xung đột hoạt chất. */
import React, { useMemo, useState } from "react";
import { dateKey } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { INGREDIENTS, ING_BY_KEY, findClashes, guessIngredients, ingName, ingredientsOf, type Clash, type IngKey } from "@/lib/ingredients";
import { CONCERN_OPTS, SENS_OPTS, TYPE_OPTS, tailor, type Concern, type Sensitivity, type SkinProfile, type SkinType } from "@/lib/profile";
import { SKIN } from "@/lib/skin";
import { pickTonight, type Mode } from "@/lib/tonight";
import type { Mutate, Product, State } from "@/lib/types";
import { ProductArt, SkinFace, productLook } from "./art";
import { api } from "./ui";

/* ================= TRẮC NGHIỆM HỒ SƠ DA ================= */
export function SkinQuiz({ initial, mutate, onDone }: { initial: SkinProfile | null; mutate: Mutate; onDone: () => void }) {
  const { tr, lang } = useI18n();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<SkinType | null>(initial?.type ?? null);
  const [concerns, setConcerns] = useState<Concern[]>(initial?.concerns ?? []);
  const [sens, setSens] = useState<Sensitivity[]>(initial?.sensitivities ?? []);
  const toggle = <T,>(list: T[], v: T, set: (l: T[]) => void) => { haptic(); set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]); };
  const L = (o: { vi: string; en: string }) => (lang === "en" ? o.en : o.vi);
  const save = () => {
    if (!type) return;
    const skinProfile: SkinProfile = { type, concerns, sensitivities: sens, updated: dateKey() };
    haptic("success");
    mutate(tr("hồ sơ da", "skin profile"), () => api("/api/settings", "PUT", { skinProfile })).then((ok) => ok && onDone());
  };
  const titles: [string, string, string, string][] = [
    ["Câu 1 / 3", "Question 1 / 3", "Da bạn thuộc kiểu nào?", "What's your skin type?"],
    ["Câu 2 / 3", "Question 2 / 3", "Bạn muốn cải thiện điều gì?", "What would you like to improve?"],
    ["Câu 3 / 3", "Question 3 / 3", "Da bạn dễ phản ứng với gì?", "Does anything irritate your skin?"],
  ];
  return (
    <div className="quiz">
      <div className="quiz-dots" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>
      <div className="label">{tr(titles[step][0], titles[step][1])}</div>
      <div className="h3">{tr(titles[step][2], titles[step][3])}</div>
      <div key={step} className="quiz-body">
        {step === 0 && (
          <div className="quiz-opts">
            {TYPE_OPTS.map((o, i) => (
              <button key={o.key} className="qopt" style={{ ["--d" as any]: i }} aria-pressed={type === o.key}
                onClick={() => { haptic(); setType(o.key); }}>
                <span className="qe">{o.emoji}</span>
                <span className="grow"><b>{L(o)}</b><small>{lang === "en" ? o.hintEn : o.hintVi}</small></span>
              </button>
            ))}
          </div>
        )}
        {step === 1 && (
          <>
            <p className="small">{tr("Chọn bao nhiêu cũng được.", "Pick as many as you like.")}</p>
            <div className="quiz-tags">
              {CONCERN_OPTS.map((o, i) => (
                <button key={o.key} style={{ ["--d" as any]: i }} aria-pressed={concerns.includes(o.key)} onClick={() => toggle(concerns, o.key, setConcerns)}>
                  <span>{o.emoji}</span>{L(o)}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <p className="small">{tr("Niks sẽ không gợi ý những hoạt chất này.", "Niks won't suggest these ingredients.")}</p>
            <div className="quiz-tags">
              {SENS_OPTS.map((o, i) => (
                <button key={o.key} style={{ ["--d" as any]: i }} aria-pressed={sens.includes(o.key)} onClick={() => toggle(sens, o.key, setSens)}>
                  <span>{o.emoji}</span>{L(o)}
                </button>
              ))}
              <button style={{ ["--d" as any]: SENS_OPTS.length }} aria-pressed={sens.length === 0} onClick={() => { haptic(); setSens([]); }}>
                <span>👌</span>{tr("Không có gì", "Nothing in particular")}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="row-btns quiz-nav">
        {step > 0 && <button className="pill soft" onClick={() => { haptic(); setStep(step - 1); }}>{tr("Quay lại", "Back")}</button>}
        {step < 2
          ? <button className="pill grow" disabled={step === 0 && !type} onClick={() => { haptic(); setStep(step + 1); }}>{tr("Tiếp", "Next")}</button>
          : <button className="pill grow" onClick={save}>{tr("Xem gợi ý cho da mình", "See my suggestions")}</button>}
      </div>
    </div>
  );
}

/* ================= GỢI Ý THEO HỒ SƠ DA ================= */
export function ProfileCard({ state, openQuiz }: { state: State; openQuiz: () => void }) {
  const { tr, lang } = useI18n();
  const profile = state.settings.skinProfile;
  const t = useMemo(() => (profile ? tailor(profile, state.products) : null), [profile, state.products]);
  if (!profile || !t) {
    return (
      <button className="card quiz-cta spring" onClick={() => { haptic(); openQuiz(); }}>
        <span className="qc-art" aria-hidden="true"><SkinFace skin="glowy" size={52} /></span>
        <span className="grow">
          <span className="label">{tr("Hồ sơ da · 1 phút", "Skin profile · 1 minute")}</span>
          <span className="h3">{tr("Cho Niks biết về da bạn", "Tell Niks about your skin")}</span>
          <span className="small">{tr("3 câu hỏi để gợi ý đúng sản phẩm, đúng hoạt chất.", "3 quick questions for suggestions that fit you.")}</span>
        </span>
      </button>
    );
  }
  const typ = TYPE_OPTS.find((o) => o.key === profile.type)!;
  return (
    <div className="card stack-gap profile-card">
      <div className="row-between">
        <div>
          <div className="label">{tr("Gợi ý cho da bạn", "Picked for your skin")}</div>
          <div className="h3">{typ.emoji} {lang === "en" ? typ.en : typ.vi}
            {profile.concerns.length > 0 && <span className="pc-sub"> · {profile.concerns.map((c) => { const o = CONCERN_OPTS.find((x) => x.key === c)!; return lang === "en" ? o.en : o.vi; }).join(", ").toLowerCase()}</span>}
          </div>
        </div>
        <button className="pill soft sm" onClick={() => { haptic(); openQuiz(); }}>{tr("Làm lại", "Retake")}</button>
      </div>
      <div className="label">{tr("Hoạt chất nên ưu tiên", "Ingredients to look for")}</div>
      <ul className="lookfor">
        {t.lookFor.map((s, i) => (
          <li key={s.key} style={{ ["--d" as any]: i }}>
            <span className="ing-dot" style={{ background: ING_BY_KEY[s.key].color }} />
            <span className="grow">
              <b>{ingName(s.key, lang)}</b>
              <small>{s.have.length ? tr(`Đã có: ${s.have.map((p) => p.name).slice(0, 2).join(", ")}`, `On your shelf: ${s.have.map((p) => p.name).slice(0, 2).join(", ")}`)
                : tr("Chưa có trong tủ — có thể cân nhắc thêm", "Not on your shelf yet — worth considering")}</small>
            </span>
            <span className={`chip ${s.have.length ? "sage" : "rose"}`}>{s.have.length ? "✓" : "+"}</span>
          </li>
        ))}
      </ul>
      {t.avoid.some((a) => a.products.length) && (
        <div className="avoid-note">
          {t.avoid.filter((a) => a.products.length).map((a) => (
            <p key={a.key}>⚠︎ {tr(`Bạn ghi nhạy cảm với ${ingName(a.key, "vi")}, nhưng đang dùng ${a.products.map((p) => p.name).join(", ")}. Dùng thưa hơn hoặc thử vùng nhỏ trước.`,
              `You marked ${ingName(a.key, "en")} as irritating, but you're using ${a.products.map((p) => p.name).join(", ")}. Use it less often or patch-test first.`)}</p>
          ))}
        </div>
      )}
      {t.tips.length > 0 && <ul className="tips">{t.tips.map(([vi, en]) => <li key={vi}>{lang === "en" ? en : vi}</li>)}</ul>}
    </div>
  );
}

/* ================= TỐI NAY DÙNG GÌ? ================= */
const MODE_TITLE: Record<Mode, [string, string, string]> = {
  soothe: ["Làm dịu & phục hồi", "Soothe and repair", "🌿"],
  hydrate: ["Cấp ẩm thật nhiều", "Hydrate and comfort", "💧"],
  clear: ["Xử lý mụn nhẹ nhàng", "Gently clear breakouts", "🎯"],
  balance: ["Cân bằng dầu", "Balance the oil", "🍃"],
  rest: ["Đêm nghỉ cho da", "A rest night", "🌙"],
  plan: ["Da ổn, cứ theo lịch", "Skin's good: follow your plan", "✨"],
};

export function TonightCard({ state, mutate, openRoutine }: { state: State; mutate: Mutate; openRoutine: () => void }) {
  const { tr, lang } = useI18n();
  const today = dateKey();
  const t = useMemo(() => pickTonight(state), [state]);
  const todayTags = state.skin[today]?.tags ?? [];
  const setTag = (k: string) => {
    haptic();
    const tags = todayTags.includes(k) ? todayTags.filter((x) => x !== k) : [...todayTags, k];
    const note = state.skin[today]?.note ?? "";
    mutate(tr("tình trạng da", "skin log"), () => tags.length || note ? api("/api/skin", "PUT", { date: today, tags, note }) : api(`/api/skin?date=${today}`, "DELETE"));
  };
  const [title, titleEn, emoji] = MODE_TITLE[t.mode];
  return (
    <div className="card tonight">
      <div className="tn-head">
        <div className="grow">
          <div className="label">{tr("Tối nay dùng gì?", "What to use tonight")}</div>
          <div className="h3">{t.fromDate ? <>{emoji} {lang === "en" ? titleEn : title}</> : tr("Da hôm nay thế nào?", "How's your skin today?")}</div>
        </div>
        <span className="tn-moon" aria-hidden="true">☾</span>
      </div>
      <div className="tn-skin" role="group" aria-label={tr("Tình trạng da hôm nay", "Today's skin")}>
        {SKIN.map((s) => (
          <button key={s.key} aria-pressed={todayTags.includes(s.key)} style={{ ["--c" as any]: s.color }} onClick={() => setTag(s.key)}>
            <SkinFace skin={s.key} size={30} /><span>{lang === "en" ? s.en : s.vi}</span>
          </button>
        ))}
      </div>
      {!t.fromDate ? (
        <p className="small">{tr("Chạm vào tình trạng da hôm nay, Niks sẽ chọn sản phẩm phù hợp từ tủ đồ của bạn.", "Tap how your skin feels and Niks will pick products from your shelf.")}</p>
      ) : (
        <>
          {t.fromDate !== today && <p className="small">{tr("Dựa trên nhật ký da hôm qua. Chạm ở trên để cập nhật hôm nay.", "Based on yesterday's skin log. Tap above to update for today.")}</p>}
          <ol className="tn-list">
            {t.picks.map(({ p, why }, i) => (
              <li key={p.id} style={{ ["--d" as any]: i }}>
                <span className="num">{i + 1}</span>
                <span className="thumb sm" style={{ background: productLook(p.group).bg }}><ProductArt group={p.group} size={28} /></span>
                <span className="info"><span className="nm">{p.name}</span><span className="meta">{lang === "en" ? why[1] : why[0]}</span></span>
              </li>
            ))}
          </ol>
          {t.skips.length > 0 && (
            <div className="tn-skips">
              <div className="label">{tr("Tạm bỏ qua tối nay", "Skipping tonight")}</div>
              {t.skips.map(({ p, why }) => (
                <div key={p.id} className="tn-skip"><s>{p.name}</s><small>{lang === "en" ? why[1] : why[0]}</small></div>
              ))}
            </div>
          )}
          <button className="pill soft wide" onClick={openRoutine}>{tr("Mở routine tối nay", "Open tonight's routine")}</button>
        </>
      )}
    </div>
  );
}

/* ================= CẢNH BÁO XUNG ĐỘT ================= */
export function ClashNotes({ products, am }: { products: Product[]; am?: boolean }) {
  const { tr, lang } = useI18n();
  const clashes = useMemo(() => findClashes(products), [products]);
  const amRetinoid = am ? products.filter((p) => ingredientsOf(p).includes("retinoid")) : [];
  if (!clashes.length && !amRetinoid.length) return null;
  return (
    <div className="clashes" role="alert">
      {clashes.map((c, i) => <ClashRow key={i} c={c} />)}
      {amRetinoid.map((p) => (
        <div key={p.id} className="clash caution">
          <b>☀︎ {p.name}</b>
          <p>{tr("Retinoid nhạy với ánh nắng, nên dùng buổi tối và luôn chống nắng sáng hôm sau.", "Retinoids break down in sunlight. Use them at night and wear sunscreen the next day.")}</p>
        </div>
      ))}
    </div>
  );
  function ClashRow({ c }: { c: Clash }) {
    return (
      <div className={`clash ${c.rule.level}`}>
        <b>{c.rule.level === "avoid" ? "⚠︎ " : "◐ "}{ingName(c.ia, lang)} + {ingName(c.ib, lang)}
          <span className="clash-lvl">{c.rule.level === "avoid" ? tr("Nên tránh", "Avoid") : tr("Lưu ý", "Careful")}</span></b>
        <small>{c.a.name} · {c.b.name}</small>
        <p>{lang === "en" ? c.rule.en : c.rule.vi}</p>
      </div>
    );
  }
}

/* ================= CHỌN HOẠT CHẤT TRONG FORM SẢN PHẨM ================= */
export function IngredientPicker({ product, value, onChange }: {
  product: Pick<Product, "name" | "note" | "group">; value: string; onChange: (v: string) => void;
}) {
  const { tr, lang } = useI18n();
  const auto = !value.trim();
  const current = ingredientsOf({ ...product, ingredients: value });
  const set = (keys: IngKey[]) => onChange(keys.length ? keys.join(",") : "none");
  return (
    <div className="field">
      <span className="row-between">{tr("Hoạt chất chính", "Key ingredients")}
        {!auto && <button type="button" className="linkbtn" onClick={() => onChange("")}>{tr("Tự nhận lại", "Auto-detect")}</button>}
      </span>
      <div className="chips wrap small-chips ing-chips" role="group">
        {INGREDIENTS.map((i) => (
          <button type="button" key={i.key} aria-pressed={current.includes(i.key)} style={{ ["--c" as any]: i.color }}
            onClick={() => { haptic(); set(current.includes(i.key) ? current.filter((k) => k !== i.key) : [...current, i.key]); }}>
            {ingName(i.key, lang)}
          </button>
        ))}
      </div>
      <span className="small">{auto
        ? (guessIngredients(product).length ? tr("Niks tự nhận từ tên sản phẩm. Chạm để sửa.", "Detected from the product name. Tap to correct.") : tr("Chưa nhận ra hoạt chất nào. Chạm để chọn.", "Nothing detected yet. Tap to choose."))
        : tr("Dùng để cảnh báo xung đột và gợi ý tối nay.", "Used for clash warnings and tonight's picks.")}</span>
    </div>
  );
}

