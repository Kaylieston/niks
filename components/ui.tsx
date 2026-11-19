"use client";
import React, { useEffect } from "react";

/** Bảng trượt từ dưới lên kiểu iOS */
export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <>
      <div className={`scrim ${open ? "on" : ""}`} onClick={onClose} />
      <div className={`sheet ${open ? "on" : ""}`} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open}>
        <div className="grab" />
        {title && <h3 className="sheet-title">{title}</h3>}
        {open && children}
      </div>
    </>
  );
}

export async function api(path: string, method: string, body?: any) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Lỗi kết nối");
  return res.json();
}

/** Tiến độ dạng vòng tròn nhỏ */
export function Ring({ value, size = 54, color = "var(--rose)" }: { value: number; size?: number; color?: string }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,247,230,.75)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${c * Math.min(1, Math.max(0, value))} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray .8s cubic-bezier(.3,.9,.3,1)" }} />
    </svg>
  );
}
