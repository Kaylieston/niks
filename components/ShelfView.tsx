"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GROUPS, STATUS_KEYS, type ProductStatus, type Scope } from "@/lib/defaults";
import { useI18n } from "@/lib/i18n";
import { parseKey } from "@/lib/dates";
import type { Mutate, Product, State } from "@/lib/types";
import { G, ProductArt, productLook } from "./art";
import { Sheet, api } from "./ui";
import { IngredientPicker } from "./Smart";
import { ING_BY_KEY, ingName, ingredientsOf } from "@/lib/ingredients";

const SCOPES: Scope[] = ["face", "hair", "body"];
const PAO_OPTIONS = [0, 3, 6, 12, 18, 24];

/** Hạn dùng sau khi mở nắp: phần đã dùng (0–1), số ngày còn lại, ngày hết hạn */
export function paoInfo(p: Pick<Product, "openedAt" | "paoMonths">) {
  if (!p.openedAt || !p.paoMonths) return null;
  const opened = parseKey(p.openedAt);
  const end = new Date(opened); end.setMonth(end.getMonth() + p.paoMonths);
  const now = new Date();
  const used = Math.min(1, Math.max(0, (now.getTime() - opened.getTime()) / (end.getTime() - opened.getTime())));
  const days = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  return { used, days, end, soon: days <= 30 };
}
const fmtDate = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

export default function ShelfView({ state, mutate, toast }: { state: State; mutate: Mutate; toast: (m: string) => void }) {
  const { tr, L } = useI18n();
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | Scope>("all");
  const [group, setGroup] = useState<string>("all");
  const [status, setStatus] = useState<"all" | ProductStatus>("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Product> | null>(null);

  const usage = useMemo(() => {
    const n: Record<string, number> = {};
    for (const s of SCOPES) for (const w of ["A", "B"] as const)
      for (const d of state.routines[s][w]) for (const sec of d.sections) for (const st of sec.steps) n[st.p] = (n[st.p] ?? 0) + 1;
    return n;
  }, [state.routines]);

  const inScope = scope === "all" ? state.products : state.products.filter((p) => p.scope === scope);
  const groups = [...new Set(inScope.map((p) => p.group))];
  const inGroup = group === "all" ? inScope : inScope.filter((p) => p.group === group);
  const list = inGroup
    .filter((p) => status === "all" || p.status === status)
    .filter((p) => (p.name + " " + p.group + " " + L.group(p.group)).toLowerCase().includes(q.trim().toLowerCase()));
  const open = state.products.find((p) => p.id === openId) ?? null;
  const add = () => setForm({ scope: scope === "all" ? "face" : scope, status: status === "all" ? "active" : status, group: group === "all" ? undefined : group });

  return (
    <section className="view">
      <div className="top">
        <div className="grow">
          <div className="sub">{tr(`${state.products.filter((p) => p.status === "active").length} đang dùng · ${state.products.length} món`,
            `${state.products.filter((p) => p.status === "active").length} in use · ${state.products.length} items`)}</div>
          <h1>{tr("Tủ đồ", "Shelf")}</h1>
        </div>
        <button className="pill" onClick={add}><G name="plus" size={16} width={2.8} />{tr("Thêm", "Add")}</button>
      </div>

      <label className="search">
        <G name="search" size={18} width={2.4} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Tìm sản phẩm", "Search products")} aria-label={tr("Tìm sản phẩm", "Search products")} />
      </label>

      <div className="seg" role="group" aria-label={tr("Mục", "Area")}>
        <button aria-pressed={scope === "all"} onClick={() => { setScope("all"); setGroup("all"); }}>{tr("Tất cả", "All")}</button>
        {SCOPES.map((s) => (
          <button key={s} aria-pressed={scope === s} onClick={() => { setScope(s); setGroup("all"); }}>{L.scope[s]}</button>
        ))}
      </div>
      <div className="chips scroll" role="group" aria-label={tr("Loại", "Category")}>
        <button aria-pressed={group === "all"} onClick={() => setGroup("all")}>{tr("Mọi loại", "All types")}</button>
        {groups.map((g) => (
          <button key={g} className="gchip" aria-pressed={group === g} onClick={() => setGroup(g)}>
            <ProductArt group={g} size={20} />{L.group(g)}
          </button>
        ))}
      </div>
      <div className="chips small-chips scroll" role="group" aria-label={tr("Trạng thái", "Status")}>
        {STATUS_KEYS.map((k) => (
          <button key={k} aria-pressed={status === k} onClick={() => setStatus(k)}>
            {L.status[k]} <span className="count">{inGroup.filter((p) => p.status === k).length}</span>
          </button>
        ))}
        <button aria-pressed={status === "all"} onClick={() => setStatus("all")}>{tr("Mọi trạng thái", "Any status")}</button>
      </div>

      <div className="grid">
        <button className="pc add-tile" onClick={add}>
          <span className="add-ic"><G name="plus" size={28} width={2.6} /></span>
          <span className="nm">{tr("Thêm sản phẩm", "Add product")}</span>
          <span className="small">{tr("Vào tủ đồ, rồi xếp vào lịch", "Add it, then put it in your routine")}</span>
        </button>
        {list.map((p, ix) => {
          const pao = paoInfo(p);
          const look = productLook(p.group);
          return (
            <button className={`pc is-${p.status}`} key={p.id} style={{ animationDelay: `${Math.min(ix, 12) * 35}ms` }} onClick={() => setOpenId(p.id)}>
              <span className="art" style={{ background: look.bg }}>
                <ProductArt group={p.group} size={72} />
                {pao?.soon && p.status !== "wish" && <span className="chip rose flag">{pao.days > 0 ? tr(`còn ${pao.days} ngày`, `${pao.days} days left`) : tr("đã hết hạn", "expired")}</span>}
                {p.status !== "active" && <span className={`status s-${p.status} flag`}>{L.status[p.status]}</span>}
              </span>
              <span className="nm">{p.name}</span>
              <span className="tags"><span className="chip">{L.group(p.group)}</span>{scope === "all" && <span className="chip sky">{L.scope[p.scope]}</span>}</span>
              {pao && p.status !== "wish" && <span className="pao"><i style={{ width: `${pao.used * 100}%`, background: pao.soon ? "var(--rose)" : "var(--sage)" }} /></span>}
              <span className="small">{usage[p.id] ? tr(`${usage[p.id]} lần / 2 tuần`, `${usage[p.id]}× per 2 weeks`) : tr("Chưa có trong lịch", "Not in routine")}</span>
            </button>
          );
        })}
      </div>
      {list.length === 0 && <div className="empty">{q ? tr(`Không có sản phẩm nào khớp “${q}”.`, `Nothing matches “${q}”.`) : tr("Chưa có sản phẩm nào ở đây.", "Nothing here yet.")}</div>}

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open?.name}>
        {open && <ProductDetail p={open} uses={usage[open.id] ?? 0} mutate={mutate}
          onEdit={() => { setForm(open); setOpenId(null); }}
          onDeleted={() => { setOpenId(null); toast(tr("Đã xoá khỏi tủ đồ", "Removed from your shelf")); }} />}
      </Sheet>

      <Sheet open={!!form} onClose={() => setForm(null)} title={form?.id ? tr("Sửa sản phẩm", "Edit product") : tr("Thêm sản phẩm", "Add product")}>
        {form && <ProductForm initial={form} mutate={mutate} onSaved={(added) => { setForm(null); toast(added ? tr("Đã thêm vào tủ đồ", "Added to your shelf") : tr("Đã lưu", "Saved")); }} />}
      </Sheet>
    </section>
  );
}

function ProductDetail({ p, uses, mutate, onEdit, onDeleted }: {
  p: Product; uses: number; mutate: Mutate; onEdit: () => void; onDeleted: () => void;
}) {
  const { tr, L, lang } = useI18n();
  const [confirmDel, setConfirmDel] = useState(false);
  const pao = paoInfo(p);
  const look = productLook(p.group);
  return (
    <div className="detail-sheet">
      <div className="row">
        <div className="art big" style={{ background: look.bg }}><ProductArt group={p.group} size={76} /></div>
        <div className="grow">
          <div className="label">{L.scope[p.scope]} · {L.group(p.group)}</div>
          <div className="small">{uses ? tr(`Có trong lịch ${uses} lần mỗi chu kỳ 2 tuần`, `In your routine ${uses}× per 2-week cycle`) : tr("Chưa có trong lịch", "Not in your routine yet")}</div>
        </div>
      </div>
      <div className="field">{tr("Trạng thái", "Status")}
        <div className="chips wrap">
          {STATUS_KEYS.map((k) => (
            <button key={k} aria-pressed={p.status === k}
              onClick={() => mutate(tr("tủ đồ", "shelf"), () => api(`/api/products/${p.id}`, "PATCH", { status: k }))}>{L.status[k]}</button>
          ))}
        </div>
      </div>
      {p.scope === "face" && ingredientsOf(p).length > 0 && (
        <div className="ing-row">{ingredientsOf(p).map((k) => <span key={k} className="ing-tag" style={{ ["--c" as any]: ING_BY_KEY[k].color }}>{ingName(k, lang)}</span>)}</div>
      )}
      {p.note && <div className="card"><div className="label">{tr("Ghi chú", "Note")}</div><p className="note">{p.note}</p></div>}
      {p.status !== "wish" && (pao ? (
        <div className="card">
          <div className="label row-between"><span>{tr("Mở nắp", "Opened")} {fmtDate(parseKey(p.openedAt))}</span><span>{tr("Dùng tới", "Use by")} {fmtDate(pao.end)}</span></div>
          <div className="pao"><i style={{ width: `${pao.used * 100}%`, background: pao.soon ? "var(--rose)" : "var(--sage)" }} /></div>
          <div className="small">{pao.days > 0 ? tr(`Còn ${pao.days} ngày`, `${pao.days} days left`) : tr("Đã quá hạn dùng sau khi mở", "Past its after-opening date")}</div>
        </div>
      ) : (
        <div className="small">{tr("Thêm ngày mở nắp để Niks nhắc khi sản phẩm sắp hết hạn.", "Add the opening date so Niks can flag it before it expires.")}</div>
      ))}
      <div className="row-btns">
        <button className="pill" onClick={onEdit}>{tr("Sửa", "Edit")}</button>
        {confirmDel ? (
          <button className="pill danger" onClick={() => mutate(tr("tủ đồ", "shelf"), () => api(`/api/products/${p.id}`, "DELETE")).then((ok) => ok && onDeleted())}>
            {uses ? tr(`Xoá và gỡ khỏi ${uses} bước`, `Delete and remove from ${uses} steps`) : tr("Chắc chắn xoá", "Yes, delete")}
          </button>
        ) : (
          <button className="pill soft" onClick={() => setConfirmDel(true)}>{tr("Xoá", "Delete")}</button>
        )}
      </div>
    </div>
  );
}

function ProductForm({ initial, mutate, onSaved }: { initial: Partial<Product>; mutate: Mutate; onSaved: (added: boolean) => void }) {
  const { tr, L } = useI18n();
  const [f, setF] = useState<Partial<Product>>({ name: "", note: "", openedAt: "", paoMonths: 0, status: "active", ...initial });
  const scope = (f.scope ?? "face") as Scope;
  const groups = [...new Set([...GROUPS[scope], ...(f.group && f.id ? [f.group] : [])])];
  const group = f.group && groups.includes(f.group) ? f.group : groups[0];
  const status = (f.status ?? "active") as ProductStatus;
  const wish = status === "wish";
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name?.trim()) return;
    const body = {
      scope, group, name: f.name.trim(), note: f.note ?? "", status,
      openedAt: wish ? "" : f.openedAt ?? "", paoMonths: wish ? 0 : f.paoMonths ?? 0,
      ingredients: scope === "face" ? f.ingredients ?? "" : "",
    };
    mutate(tr("tủ đồ", "shelf"), () => f.id ? api(`/api/products/${f.id}`, "PATCH", body) : api("/api/products", "POST", body))
      .then((ok) => ok && onSaved(!f.id));
  };
  return (
    <form className="form pform" onSubmit={save}>
      <label className="field">{tr("Tên sản phẩm", "Product name")}
        <input id="pf-name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={tr("VD: Kem dưỡng phục hồi", "e.g. Barrier repair cream")} />
      </label>

      <div className="field">{tr("Trạng thái", "Status")}
        <div className="chips wrap" role="group">
          {STATUS_KEYS.map((k) => <button type="button" key={k} aria-pressed={status === k} onClick={() => setF({ ...f, status: k })}>{L.status[k]}</button>)}
        </div>
      </div>

      <div className="field">{tr("Dùng cho", "For")}
        <div className="seg" role="group">
          {SCOPES.map((s) => <button type="button" key={s} aria-pressed={scope === s} onClick={() => setF({ ...f, scope: s, group: undefined })}>{L.scope[s]}</button>)}
        </div>
      </div>

      <div className="field">{tr("Loại sản phẩm", "Category")}
        <div className="cat-grid" role="group">
          {groups.map((g) => (
            <button type="button" key={g} aria-pressed={group === g} onClick={() => setF({ ...f, group: g })}>
              <span className="ci" style={{ background: productLook(g).bg }}><ProductArt group={g} size={34} /></span>
              <span>{L.group(g)}</span>
            </button>
          ))}
        </div>
      </div>

      {!wish && (
        <div className="pao-fields">
          <label className="field">{tr("Ngày mở nắp", "Date opened")}
            <input id="pf-opened" type="date" value={f.openedAt} onChange={(e) => setF({ ...f, openedAt: e.target.value })} />
          </label>
          <div className="field">{tr("Dùng trong (sau khi mở)", "Use within (after opening)")}
            <div className="chips wrap" role="group">
              {PAO_OPTIONS.map((m) => (
                <button type="button" key={m} aria-pressed={(f.paoMonths ?? 0) === m} onClick={() => setF({ ...f, paoMonths: m })}>
                  {m ? tr(`${m} tháng`, `${m} months`) : tr("Không theo dõi", "Don't track")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {scope === "face" && <IngredientPicker product={{ name: f.name ?? "", note: f.note ?? "", group }} value={f.ingredients ?? ""} onChange={(v) => setF({ ...f, ingredients: v })} />}

      <label className="field">{tr("Ghi chú", "Note")}
        <textarea id="pf-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={tr("Cách dùng, lưu ý…", "How to use, tips…")} />
      </label>
      <button className="pill wide" type="submit">{f.id ? tr("Lưu thay đổi", "Save changes") : wish ? tr("Thêm vào danh sách muốn mua", "Add to wishlist") : tr("Thêm vào tủ đồ", "Add to shelf")}</button>
    </form>
  );
}
