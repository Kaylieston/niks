/** Cảm xúc hằng ngày: mỗi cảm xúc là một "blob" vẽ tay bằng SVG (hình dạng + khuôn mặt riêng). */

const INK = "#2D3A47";

/** Tạo đường cong khép kín mềm mại đi qua các điểm quanh tâm (Catmull-Rom → Bézier). */
function blobPath(r: number[], sx = 1, sy = 1, cx = 32, cy = 34) {
  const n = r.length;
  const pts = r.map((rad, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * rad * sx, cy + Math.sin(a) * rad * sy];
  });
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

const S = `stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
const cheeks = `<ellipse cx="19" cy="38" rx="4" ry="2.4" fill="#B46A72" opacity=".22"/><ellipse cx="45" cy="38" rx="4" ry="2.4" fill="#B46A72" opacity=".22"/>`;
const dots = `<circle cx="25" cy="31" r="2" fill="${INK}"/><circle cx="39" cy="31" r="2" fill="${INK}"/>`;

type MoodDef = { key: string; name: string; en: string; color: string; r: number[]; sx?: number; sy?: number; face: string };

const DEFS: MoodDef[] = [
  { key: "happy", name: "Vui", en: "Happy", color: "#F7C8D3", r: [19, 25, 27, 26, 25, 25, 26, 25, 25, 26, 27, 25],
    face: `<path d="M21 32q3.5-5 7 0M36 32q3.5-5 7 0" ${S}/><path d="M27 38q5 5 10 0" ${S}/>` + cheeks },
  { key: "glowing", name: "Rạng rỡ", en: "Glowing", color: "#FCE3A6", r: [26, 23, 26, 23, 26, 23, 26, 23, 26, 23, 26, 23],
    face: `<path d="M25 27l1.2 3.3 3.3 1.2-3.3 1.2L25 36l-1.2-3.3-3.3-1.2 3.3-1.2zM39 27l1.2 3.3 3.3 1.2-3.3 1.2L39 36l-1.2-3.3-3.3-1.2 3.3-1.2z" fill="${INK}"/><path d="M28 40q4 3.5 8 0" ${S}/>` + cheeks },
  { key: "calm", name: "Bình yên", en: "Calm", color: "#BCC7A2", r: [24, 24, 25, 26, 27, 24, 28, 24, 27, 26, 25, 24],
    face: `<path d="M21 31q3.5 4 7 0M36 31q3.5 4 7 0" ${S}/><path d="M29 39q3 2.5 6 0" ${S}/>` },
  { key: "loved", name: "Được yêu", en: "Loved", color: "#EFA9BA", r: [17, 25, 28, 26, 23, 23, 27, 23, 23, 26, 28, 25],
    face: `<path d="M25 34c-5-3-5-7-2.5-7.5 1.3-.3 2.2.6 2.5 1.6.3-1 1.2-1.9 2.5-1.6 2.5.5 2.5 4.5-2.5 7.5zM39 34c-5-3-5-7-2.5-7.5 1.3-.3 2.2.6 2.5 1.6.3-1 1.2-1.9 2.5-1.6 2.5.5 2.5 4.5-2.5 7.5z" fill="#B46A72"/><path d="M27 39q5 4.5 10 0" ${S}/>` },
  { key: "okay", name: "Bình thường", en: "Okay", color: "#D6DEE6", r: [27, 25, 23, 22, 22, 23, 24, 23, 22, 22, 23, 25],
    face: dots + `<path d="M28 40h8" ${S}/>` },
  { key: "proud", name: "Tự hào", en: "Proud", color: "#CBD3A8", r: [27, 22, 27, 22, 27, 22, 27, 22, 27, 22],
    face: `<path d="M21 31q3.5-4.5 7 0M36 31q3.5-4.5 7 0" ${S}/><path d="M26 37q6 8 12 0z" fill="${INK}"/>` + cheeks },
  { key: "tired", name: "Mệt", en: "Tired", color: "#E2DCD2", r: Array(12).fill(23), sx: 1.22, sy: 0.82,
    face: `<path d="M21 32h7M36 32h7" ${S}/><path d="M22 35q2.5 1.5 5 0M37 35q2.5 1.5 5 0" stroke="${INK}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".5"/><path d="M27 40q2.5-2 5 0q2.5 2 5 0" ${S}/>` },
  { key: "sleepy", name: "Buồn ngủ", en: "Sleepy", color: "#A9B7C6", r: [23, 27, 23, 27, 23, 27, 23, 27],
    face: `<path d="M21 32q3.5 3 7 0M36 32q3.5 3 7 0" ${S}/><circle cx="32" cy="40" r="1.8" fill="${INK}"/><path d="M46 14h5l-5 5h5" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` },
  { key: "sad", name: "Buồn", en: "Sad", color: "#9DB0C6", r: [21, 22, 24, 26, 28, 28, 28, 28, 26, 24, 22, 21], sx: 1.05,
    face: dots + `<path d="M27 42q5-5 10 0" ${S}/><path d="M41.5 35q-2.2 3.2 0 4.4 2.2-1.2 0-4.4z" fill="#FFF7E6"/>` },
  { key: "anxious", name: "Lo lắng", en: "Anxious", color: "#C9B8CC", r: [26, 22, 27, 23, 25, 28, 22, 26, 24, 27, 23, 25],
    face: `<circle cx="25" cy="30" r="3.4" fill="#FFF7E6" stroke="${INK}" stroke-width="2"/><circle cx="39" cy="30" r="3.4" fill="#FFF7E6" stroke="${INK}" stroke-width="2"/><circle cx="25" cy="30" r="1.3" fill="${INK}"/><circle cx="39" cy="30" r="1.3" fill="${INK}"/><path d="M28 40q2-2 4 0q2 2 4 0" ${S}/><path d="M49 18q-2.5 3.5 0 5 2.5-1.5 0-5z" fill="#A9B7C6"/>` },
  { key: "stressed", name: "Căng thẳng", en: "Stressed", color: "#DCA2A7", r: [23, 25, 31, 24, 24, 25, 25, 25, 24, 24, 31, 25],
    face: `<path d="M25 31m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0M25 31m-1.2 0a1.2 1.2 0 1 0 2.4 0M39 31m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0M39 31m-1.2 0a1.2 1.2 0 1 0 2.4 0" stroke="${INK}" stroke-width="1.6" fill="none"/><path d="M25 40l2.3-2 2.3 2 2.3-2 2.3 2 2.3-2 2.3 2" ${S} stroke-width="1.8"/>` },
  { key: "grumpy", name: "Bực bội", en: "Grumpy", color: "#C98990", r: [30, 21, 29, 24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 29, 21],
    face: `<path d="M21 27l7 3M43 27l-7 3" ${S}/><circle cx="25" cy="33" r="2" fill="${INK}"/><circle cx="39" cy="33" r="2" fill="${INK}"/><path d="M27 42q5-4 10 0" ${S}/>` },
];

export type Mood = { key: string; name: string; en: string; color: string; svg: string };

export const MOODS: Mood[] = DEFS.map((m) => ({
  key: m.key, name: m.name, en: m.en, color: m.color,
  svg: `<path d="${blobPath(m.r, m.sx ?? 1, m.sy ?? 1)}" fill="${m.color}"/>${m.face}`,
}));
export const MOOD_KEYS = MOODS.map((m) => m.key);
export const MOOD_BY_KEY: Record<string, Mood> = Object.fromEntries(MOODS.map((m) => [m.key, m]));
export const QUICK_MOODS = ["glowing", "happy", "okay", "tired", "stressed"];
/** Tên cảm xúc theo ngôn ngữ */
export const moodName = (key: string, lang: "vi" | "en") => { const m = MOOD_BY_KEY[key]; return m ? (lang === "en" ? m.en : m.name) : ""; };
