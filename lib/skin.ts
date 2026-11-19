/** Tình trạng da hằng ngày: mỗi tình trạng có một "gương mặt da" nhỏ vẽ bằng SVG. */

const INK = "#2D3A47";
const S = `stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
const face = (fill: string) =>
  `<path d="M32 6c14 0 25 10 25 25 0 15-10 27-25 27S7 46 7 31C7 16 18 6 32 6z" fill="${fill}"/>` +
  `<path d="M17 19q4-6 11-7" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".6"/>`;
const eyesOpen = `<circle cx="24" cy="30" r="2.1" fill="${INK}"/><circle cx="40" cy="30" r="2.1" fill="${INK}"/>`;
const eyesHappy = `<path d="M20.5 31q3.5-4.5 7 0M36.5 31q3.5-4.5 7 0" ${S}/>`;
const eyesClosed = `<path d="M20.5 30q3.5 3.5 7 0M36.5 30q3.5 3.5 7 0" ${S}/>`;
const cheeks = (o = ".25") => `<ellipse cx="18" cy="37" rx="4.2" ry="2.6" fill="#B46A72" opacity="${o}"/><ellipse cx="46" cy="37" rx="4.2" ry="2.6" fill="#B46A72" opacity="${o}"/>`;

export type SkinKey = "glowy" | "calm" | "dry" | "oily" | "acne" | "red" | "flaky" | "sensitive";
export type SkinDef = { key: SkinKey; vi: string; en: string; good: boolean; color: string; svg: string };

export const SKIN: SkinDef[] = [
  { key: "glowy", vi: "Căng bóng", en: "Glowy", good: true, color: "#FCE3A6",
    svg: face("#FBE3CF") + eyesHappy + `<path d="M27 38q5 5 10 0" ${S}/>` + cheeks() +
      `<path d="M50 8l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5zM12 44l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill="#F2B84B"/>` },
  { key: "calm", vi: "Dịu", en: "Calm", good: true, color: "#BCC7A2",
    svg: face("#F6DCC7") + eyesClosed + `<path d="M28.5 39q3.5 3 7 0" ${S}/>` + cheeks(".18") +
      `<path d="M47 9c6 0 9 4 9 9-5 0-9-3-9-9z" fill="#A8B58A"/><path d="M47 9q4 4 9 9" stroke="#7E9460" stroke-width="1.2" fill="none"/>` },
  { key: "dry", vi: "Khô", en: "Dry", good: false, color: "#E8D3B0",
    svg: face("#F1DCC4") + eyesOpen + `<path d="M28 40h8" ${S}/>` +
      `<path d="M14 22l4 3-2 3 4 2M46 42l4 2-1 3 4 1M44 15l3 2 3-1" stroke="#B48C64" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` },
  { key: "oily", vi: "Đổ dầu", en: "Oily", good: false, color: "#F2C879",
    svg: face("#F8D9B8") + eyesOpen + `<path d="M27 40q2.5-2 5 0t5 0" ${S}/>` +
      `<path d="M32 9q-3.5 5 0 7 3.5-2 0-7zM22 14q-2.5 3.5 0 5 2.5-1.5 0-5zM43 14q-2.5 3.5 0 5 2.5-1.5 0-5z" fill="#F0B64E"/>` +
      `<ellipse cx="32" cy="23" rx="9" ry="2.2" fill="#fff" opacity=".7"/>` },
  { key: "acne", vi: "Nổi mụn", en: "Breakouts", good: false, color: "#EFA9BA",
    svg: face("#F6DCC7") + eyesOpen + `<path d="M28 41q4-3 8 0" ${S}/>` +
      `<circle cx="17" cy="39" r="2.4" fill="#D9737F"/><circle cx="21" cy="44" r="1.6" fill="#D9737F"/><circle cx="46" cy="40" r="2.2" fill="#D9737F"/><circle cx="40" cy="18" r="1.8" fill="#D9737F"/><circle cx="16.6" cy="38.4" r=".8" fill="#fff"/>` },
  { key: "red", vi: "Ửng đỏ", en: "Redness", good: false, color: "#DCA2A7",
    svg: face("#F6D2C4") + eyesOpen + `<path d="M28 40q4 2.5 8 0" ${S}/>` +
      `<ellipse cx="18" cy="37" rx="7.5" ry="5" fill="#E07A86" opacity=".55"/><ellipse cx="46" cy="37" rx="7.5" ry="5" fill="#E07A86" opacity=".55"/><ellipse cx="32" cy="33" rx="3.5" ry="2.4" fill="#E07A86" opacity=".4"/>` },
  { key: "flaky", vi: "Bong tróc", en: "Flaky", good: false, color: "#D6DEE6",
    svg: face("#F3DECB") + eyesOpen + `<path d="M28 41q2-1.6 4 0t4 0" ${S}/>` +
      `<path d="M14 26l4-1 1 3-4 1zM45 22l4 0 0 3-3 1zM44 44l3-2 2 3-3 1zM20 46l3 0-1 3z" fill="#fff" stroke="#C9B49A" stroke-width="1"/>` },
  { key: "sensitive", vi: "Châm chích", en: "Stinging", good: false, color: "#C9B8CC",
    svg: face("#F6DCC7") + `<path d="M21 28l5 2.5-5 2.5M43 28l-5 2.5 5 2.5" ${S}/>` + `<path d="M27 41l2.5-2 2.5 2 2.5-2 2.5 2" ${S} stroke-width="1.8"/>` +
      `<path d="M52 8l-4 7h4l-4 7" stroke="#B46A72" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` },
];
export const SKIN_KEYS = SKIN.map((s) => s.key) as string[];
export const SKIN_BY_KEY: Record<string, SkinDef> = Object.fromEntries(SKIN.map((s) => [s.key, s]));

/** Nhãn da cũ (lưu bằng chữ tiếng Việt trong nhật ký cảm xúc) → khoá mới */
const LEGACY: Record<string, SkinKey> = {
  "Căng bóng": "glowy", "Khô": "dry", "Đổ dầu": "oily", "Nổi mụn": "acne", "Ửng đỏ": "red", "Bong tróc": "flaky", "Dịu": "calm",
};
export const legacySkinKey = (tag: string): SkinKey | undefined => (SKIN_BY_KEY[tag] ? (tag as SkinKey) : LEGACY[tag]);
