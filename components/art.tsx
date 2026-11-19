import React from "react";
import { GROUP_ICON } from "@/lib/defaults";
import { MOOD_BY_KEY } from "@/lib/moods";
import { SKIN_BY_KEY } from "@/lib/skin";

const INK = "#2D3A47";

/** Kiểu bao bì + màu cho từng loại sản phẩm, theo nhóm trong lib/defaults.ts */
const LOOK: Record<string, { kind: Kind; col: string; bg: string }> = {
  micellar: { kind: "bottle", col: "#C9D3DD", bg: "#E5EAF0" },
  cleanser: { kind: "pump", col: "#A9B7C6", bg: "#E5EAF0" },
  exfoliant: { kind: "tube", col: "#BCC7A2", bg: "#E9EDDC" },
  toner: { kind: "bottle", col: "#F7C8D3", bg: "#FCE6EB" },
  balm: { kind: "dropper", col: "#E8B7A0", bg: "#FCE6EB" },
  serum: { kind: "dropper", col: "#CBD3A8", bg: "#E9EDDC" },
  cream: { kind: "jar", col: "#FFF0CF", bg: "#F8EBD2" },
  mask: { kind: "sachet", col: "#BCC7A2", bg: "#E9EDDC" },
  sun: { kind: "tube", col: "#FCE3A6", bg: "#F8EBD2" },
  water: { kind: "pump", col: "#A9B7C6", bg: "#E5EAF0" },
  flower: { kind: "jar", col: "#F7C8D3", bg: "#FCE6EB" },
};
type Kind = "pump" | "bottle" | "dropper" | "jar" | "tube" | "sachet";

export function productLook(group?: string) {
  return LOOK[(group && GROUP_ICON[group]) || "flower"] ?? LOOK.flower;
}

function Face({ y }: { y: number }) {
  return (
    <>
      <circle cx="27" cy={y} r="1.8" fill={INK} />
      <circle cx="37" cy={y} r="1.8" fill={INK} />
      <path d={`M29.5 ${y + 4}q2.5 2.2 5 0`} stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  );
}
const Label = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) =>
  <rect x={x} y={y} width={w} height={h} rx="6" fill="#FFF7E6" opacity=".85" />;
const Shine = ({ x, y, h }: { x: number; y: number; h: number }) =>
  <rect x={x} y={y} width="4" height={h} rx="2" fill="#fff" opacity=".55" />;

/** Hình minh hoạ sản phẩm (chai, tuýp, hũ…) có mặt cười nhỏ */
export function ProductArt({ group, size = 48, className }: { group?: string; size?: number; className?: string }) {
  const { kind, col } = productLook(group);
  let body: React.ReactNode;
  switch (kind) {
    case "pump":
      body = <><rect x="27" y="6" width="18" height="6" rx="3" fill={INK} /><rect x="40" y="6" width="12" height="4" rx="2" fill={INK} /><rect x="28" y="12" width="8" height="14" rx="2" fill={INK} /><rect x="14" y="26" width="36" height="58" rx="12" fill={col} /><Label x={19} y={44} w={26} h={24} /><Face y={53} /><Shine x={19} y={32} h={10} /></>;
      break;
    case "bottle":
      body = <><rect x="24" y="4" width="16" height="16" rx="4" fill={INK} /><path d="M22 20h20v6c6 3 9 8 9 14v38a6 6 0 0 1-6 6H19a6 6 0 0 1-6-6V40c0-6 3-11 9-14z" fill={col} /><Label x={18} y={46} w={28} h={24} /><Face y={55} /><Shine x={18} y={32} h={10} /></>;
      break;
    case "dropper":
      body = <><path d="M26 8a6 6 0 0 1 12 0v16H26z" fill="#B46A72" /><rect x="22" y="22" width="20" height="10" rx="3" fill={INK} /><rect x="14" y="32" width="36" height="52" rx="10" fill={col} /><Label x={19} y={48} w={26} h={24} /><Face y={57} /><Shine x={19} y={38} h={10} /></>;
      break;
    case "jar":
      body = <><rect x="8" y="34" width="48" height="12" rx="5" fill={INK} /><rect x="10" y="44" width="44" height="40" rx="12" fill={col} /><Label x={17} y={52} w={30} h={24} /><Face y={61} /><Shine x={15} y={50} h={10} /></>;
      break;
    case "tube":
      body = <><path d="M14 8h36l-3 58H17z" fill={col} /><rect x="14" y="4" width="36" height="7" rx="2" fill={col} opacity=".7" /><rect x="21" y="66" width="22" height="18" rx="5" fill={INK} /><Label x={19} y={28} w={26} h={24} /><Face y={37} /><Shine x={19} y={14} h={10} /></>;
      break;
    case "sachet":
      body = <><path d="M10 16l6-6 6 6 6-6 6 6 6-6 6 6 6-6v68H10z" fill={col} /><rect x="10" y="72" width="44" height="12" rx="2" fill={col} opacity=".75" /><Label x={17} y={36} w={30} h={24} /><Face y={45} /><Shine x={15} y={24} h={10} /></>;
      break;
  }
  return (
    <svg className={className} width={size * (64 / 88)} height={size} viewBox="0 0 64 88" aria-hidden="true">{body}</svg>
  );
}

/** Blob cảm xúc */
export function MoodBlob({ mood, size = 48, className }: { mood: string; size?: number; className?: string }) {
  const m = MOOD_BY_KEY[mood];
  if (!m) return null;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: m.svg }} />
  );
}

/** Gương mặt minh hoạ tình trạng da */
export function SkinFace({ skin, size = 48, className }: { skin: string; size?: number; className?: string }) {
  const m = SKIN_BY_KEY[skin];
  if (!m) return null;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: m.svg }} />
  );
}

/** Nét vẽ icon đơn giản cho thanh tab & nút */
export const Glyph = {
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  routine: <><circle cx="6" cy="6" r="2.2" /><circle cx="6" cy="18" r="2.2" /><path d="M6 8.5v7M11 6h9M11 12h9M11 18h9" /></>,
  shelf: <><rect x="5" y="9" width="6" height="11" rx="2" /><path d="M7 9V6h2v3" /><rect x="13" y="12" width="7" height="8" rx="2" /><path d="M14 12v-2h5v2" /></>,
  mood: <><path d="M12 3.5c5 0 8.5 3.6 8.5 8.3S17 20.5 12 20.5 3.5 16.5 3.5 11.8 7 3.5 12 3.5z" /><path d="M9 10.5v.5M15 10.5v.5M9 14.5q3 2.5 6 0" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /></>,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4z" />,
  prev: <path d="M15 6l-6 6 6 6" />,
  next: <path d="M9 6l6 6-6 6" />,
  check: <path d="M5 12l5 5 9-10" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  progress: <><path d="M4 20V10M10 20V5M16 20v-7M22 20H2" /><path d="M14.5 4.5l2 2 3.5-3.5" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 3.6 5.4 3.6 8.5s-1 6.1-3.6 8.5c-2.6-2.4-3.6-5.4-3.6-8.5s1-6.1 3.6-8.5z" /></>,
  grip: <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />,
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />,
};
export function G({ name, size = 22, width = 2 }: { name: keyof typeof Glyph; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{Glyph[name]}</svg>
  );
}
