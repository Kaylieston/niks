"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GROUPS, SCOPE_LABEL, STATUS, STATUS_KEYS, type ProductStatus, type Scope } from "@/lib/defaults";
import { parseKey } from "@/lib/dates";
import type { Mutate, Product, State } from "@/lib/types";
import { G, ProductArt, productLook } from "./art";
import { Sheet, api } from "./ui";

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

export default function ShelfView({ state, mutate, addSignal, toast }: {
  state: State; mutate: Mutate; addSignal: number; toast: (m: string) => void;
}) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | Scope>("all");
  const [status, setStatus] = useState<"all" | ProductStatus>("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Product> | null>(null);

  useEffect(() => { if (addSignal) setForm({ scope: scope === "all" ? "face" : scope, status: "active" }); }, [addSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const usage = useMemo(() => {
    const n: Record<string, number> = {};
    for (const s of SCOPES) for (const w of ["A", "B"] as const)
      for (const d of state.routines[s][w]) for (const sec of d.sections) for (const st of sec.steps) n[st.p] = (n[st.p] ?? 0) + 1;
    return n;
  }, [state.routines]);

  const inScope = scope === "all" ? state.products : state.products.filter((p) => p.scope === scope);
  const list = inScope
    .filter((p) => status === "all" || p.status === status)
    .filter((p) => (p.name + " " + p.group).toLowerCase().includes(q.trim().toLowerCase()));
  const open = state.products.find((p) => p.id === openId) ?? null;

  return (
    <section className="view">
      <div className="top">
        <div className="grow">
          <div className="sub">{state.products.filter((p) => p.status === "active").length} đang dùng · {state.products.length} món</div>
          <h1>Tủ đồ</h1>
        </div>
        <button className="iconbtn" aria-label="Thêm sản phẩm" onClick={() => setForm({ scope: scope === "all" ? "face" : scope, status: "active" })}>
          <G name="plus" size={20} width={2.5} />
        </button>
      </div>

      <label className="search">
        <G name="search" size={18} width={2.4} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sản phẩm" aria-label="Tìm sản phẩm" />
      </label>

      <div className="chips" role="group" aria-label="Mục">
        <button aria-pressed={scope === "all"} onClick={() => setScope("all")}>Tất cả</button>
        {SCOPES.map((s) => (
          <button key={s} aria-pressed={scope === s} onClick={() => setScope(s)}>{SCOPE_LABEL[s]}</button>
        ))}
      </div>
      <div className="chips small-chips" role="group" aria-label="Trạng thái">
        {STATUS_KEYS.map((k) => (
          <button key={k} aria-pressed={status === k} onClick={() => setStatus(k)}>
            {STATUS[k]} <span className="count">{inScope.filter((p) => p.status === k).length}</span>
          </button>
        ))}
        <button aria-pressed={status === "all"} onClick={() => setStatus("all")}>Mọi trạng thái</button>
      </div>

      <div className="grid">
        {list.length === 0 && <div className="empty">{q ? `Không có sản phẩm nào khớp “${q}”.` : "Chưa có sản phẩm nào ở đây."}</div>}
        {list.map((p, ix) => {
          const pao = paoInfo(p);
          const look = productLook(p.group);
          return (
            <button className={`pc is-${p.status}`} key={p.id} style={{ animationDelay: `${Math.min(ix, 12) * 35}ms` }} onClick={() => setOpenId(p.id)}>
              <span className="art" style={{ background: look.bg }}>
                <ProductArt group={p.group} size={72} />
                {pao?.soon && <span className="chip rose flag">{pao.days > 0 ? `còn ${pao.days} ngày` : "đã hết hạn"}</span>}
                {p.status !== "active" && <span className={`status s-${p.status} flag`}>{STATUS[p.status]}</span>}
              </span>
              <span className="nm">{p.name}</span>
              <span className="tags"><span className="chip">{p.group}</span>{scope === "all" && <span className="chip sky">{SCOPE_LABEL[p.scope]}</span>}</span>
              {pao && <span className="pao"><i style={{ width: `${pao.used * 100}%`, background: pao.soon ? "var(--rose)" : "var(--sage)" }} /></span>}
              <span className="small">{usage[p.id] ? `${usage[p.id]} lần / 2 tuần` : "Chưa có trong lịch"}</span>
            </button>
          );
        })}
      </div>

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open?.name}>
        {open && <ProductDetail p={open} uses={usage[open.id] ?? 0} mutate={mutate}
          onEdit={() => { setForm(open); setOpenId(null); }}
          onDeleted={() => { setOpenId(null); toast("Đã xoá khỏi tủ đồ"); }} />}
      </Sheet>

      <Sheet open={!!form} onClose={() => setForm(null)} title={form?.id ? "Sửa sản phẩm" : "Thêm sản phẩm"}>
        {form && <ProductForm initial={form} mutate={mutate} onSaved={(added) => { setForm(null); toast(added ? "Đã thêm vào tủ đồ" : "Đã lưu"); }} />}
      </Sheet>
    </section>
  );
}

function ProductDetail({ p, uses, mutate, onEdit, onDeleted }: {
  p: Product; uses: number; mutate: Mutate; onEdit: () => void; onDeleted: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const pao = paoInfo(p);
  const look = productLook(p.group);
  return (
    <div className="detail-sheet">
      <div className="row">
        <div className="art big" style={{ background: look.bg }}><ProductArt group={p.group} size={76} /></div>
        <div className="grow">
          <div className="label">{SCOPE_LABEL[p.scope]} · {p.group}</div>
          <div className="small">{uses ? `Có trong lịch ${uses} lần mỗi chu kỳ 2 tuần (≈ ${String(uses / 2).replace(".", ",")} lần/tuần)` : "Chưa có trong lịch"}</div>
        </div>
      </div>
      <div className="field">Trạng thái
        <div className="chips wrap">
          {STATUS_KEYS.map((k) => (
            <button key={k} aria-pressed={p.status === k}
              onClick={() => mutate("tủ đồ", () => api(`/api/products/${p.id}`, "PATCH", { status: k }))}>{STATUS[k]}</button>
          ))}
        </div>
      </div>
      {p.note && <div className="card"><div className="label">Ghi chú</div><p className="note">{p.note}</p></div>}
      {pao ? (
        <div className="card">
          <div className="label row-between"><span>Mở nắp {fmtDate(parseKey(p.openedAt))}</span><span>Dùng tới {fmtDate(pao.end)}</span></div>
          <div className="pao"><i style={{ width: `${pao.used * 100}%`, background: pao.soon ? "var(--rose)" : "var(--sage)" }} /></div>
          <div className="small">{pao.days > 0 ? `Còn ${pao.days} ngày` : "Đã quá hạn dùng sau khi mở"}</div>
        </div>
      ) : (
        <div className="small">Thêm ngày mở nắp để Niks nhắc khi sản phẩm sắp hết hạn.</div>
      )}
      <div className="row-btns">
        <button className="pill" onClick={onEdit}>Sửa</button>
        {confirmDel ? (
          <button className="pill danger" onClick={() => mutate("tủ đồ", () => api(`/api/products/${p.id}`, "DELETE")).then((ok) => ok && onDeleted())}>
            {uses ? `Xoá và gỡ khỏi ${uses} bước` : "Chắc chắn xoá"}
          </button>
        ) : (
          <button className="pill soft" onClick={() => setConfirmDel(true)}>Xoá</button>
        )}
      </div>
    </div>
  );
}

function ProductForm({ initial, mutate, onSaved }: { initial: Partial<Product>; mutate: Mutate; onSaved: (added: boolean) => void }) {
  const [f, setF] = useState<Partial<Product>>({ name: "", note: "", openedAt: "", paoMonths: 0, ...initial });
  const scope = (f.scope ?? "face") as Scope;
  const groups = GROUPS[scope];
  const group = f.group && (groups.includes(f.group) || f.id) ? f.group : groups[0];
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name?.trim()) return;
    const body = { scope, group, name: f.name.trim(), note: f.note ?? "", status: f.status ?? "active", openedAt: f.openedAt ?? "", paoMonths: f.paoMonths ?? 0 };
    mutate("tủ đồ", () => f.id ? api(`/api/products/${f.id}`, "PATCH", body) : api("/api/products", "POST", body))
      .then((ok) => ok && onSaved(!f.id));
  };
  return (
    <form className="form" onSubmit={save}>
      <label className="field">Tên sản phẩm
        <input id="pf-name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="VD: Kem dưỡng phục hồi" />
      </label>
      <div className="row2">
        <label className="field">Mục
          <select id="pf-scope" value={scope} onChange={(e) => setF({ ...f, scope: e.target.value as Scope, group: undefined })}>
            {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="field">Nhóm
          <select id="pf-group" value={group} onChange={(e) => setF({ ...f, group: e.target.value })}>
            {[...new Set([...groups, ...(f.group ? [f.group] : [])])].map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
      </div>
      <div className="row2">
        <label className="field">Ngày mở nắp
          <input id="pf-opened" type="date" value={f.openedAt} onChange={(e) => setF({ ...f, openedAt: e.target.value })} />
        </label>
        <label className="field">Dùng trong
          <select id="pf-pao" value={f.paoMonths} onChange={(e) => setF({ ...f, paoMonths: +e.target.value })}>
            {PAO_OPTIONS.map((m) => <option key={m} value={m}>{m ? `${m} tháng` : "Không theo dõi"}</option>)}
          </select>
        </label>
      </div>
      <label className="field">Ghi chú
        <textarea id="pf-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Cách dùng, lưu ý…" />
      </label>
      <button className="pill wide" type="submit">{f.id ? "Lưu thay đổi" : "Thêm vào tủ đồ"}</button>
    </form>
  );
}
