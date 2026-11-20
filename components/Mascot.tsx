"use client";
/** Mèo Niks: phản ứng theo chuỗi ngày — vui khi xong routine, buồn ngủ ban đêm, cổ vũ khi đạt mốc. */
import React from "react";

export type CatMood = "happy" | "sleepy" | "cheer" | "idle" | "nudge";
export const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

const INK = "#1F1B1D";
const PINK = "#F4A7B4";

export function Cat({ mood, size = 96 }: { mood: CatMood; size?: number }) {
  const eyes = {
    happy: <path d="M47 50q4-5 8 0M65 50q4-5 8 0" stroke="#FFF7E6" strokeWidth="2.6" fill="none" strokeLinecap="round" />,
    cheer: <path d="M46 47l7 3-7 3M74 47l-7 3 7 3" stroke="#FFF7E6" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    sleepy: <path d="M47 50q4 3.5 8 0M65 50q4 3.5 8 0" stroke="#FFF7E6" strokeWidth="2.4" fill="none" strokeLinecap="round" />,
    idle: <g className="cat-blink"><ellipse cx="51" cy="49" rx="3" ry="3.6" fill="#FFF7E6" /><ellipse cx="69" cy="49" rx="3" ry="3.6" fill="#FFF7E6" /><circle cx="52" cy="48" r="1.1" fill={INK} /><circle cx="70" cy="48" r="1.1" fill={INK} /></g>,
    nudge: <g className="cat-blink"><ellipse cx="51" cy="50" rx="3" ry="3.4" fill="#FFF7E6" /><ellipse cx="69" cy="50" rx="3" ry="3.4" fill="#FFF7E6" /><circle cx="51.5" cy="51" r="1.2" fill={INK} /><circle cx="69.5" cy="51" r="1.2" fill={INK} /></g>,
  }[mood];
  const mouth = mood === "happy" || mood === "cheer"
    ? <path d="M56 59q4 5 8 0z" fill={PINK} stroke="#FFF7E6" strokeWidth="1.4" strokeLinejoin="round" />
    : mood === "sleepy" ? <path d="M58 60q2 1.4 4 0" stroke="#FFF7E6" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    : <path d="M56 58q2 2 4 0q2 2 4 0" stroke="#FFF7E6" strokeWidth="1.6" fill="none" strokeLinecap="round" />;

  return (
    <svg className={`ncat cat-${mood}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      {mood === "sleepy" && <path className="cat-moon" d="M16 92a46 46 0 0 0 88 0 38 38 0 0 1-88 0z" fill="#FCE3A6" />}
      <g className="cat-tail-wrap">
        <path className="cat-tail" d="M84 92c14 0 22-8 22-20 0-8-5-12-9-10" stroke={INK} strokeWidth="8" fill="none" strokeLinecap="round" />
      </g>
      <g className="cat-body">
        <ellipse cx="60" cy="88" rx="28" ry="20" fill={INK} />
        {mood === "cheer"
          ? <><path className="cat-paw l" d="M38 80q-10-14-6-26" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" /><path className="cat-paw r" d="M82 80q10-14 6-26" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" /></>
          : <><ellipse cx="48" cy="104" rx="7" ry="4.5" fill={INK} /><ellipse cx="72" cy="104" rx="7" ry="4.5" fill={INK} /></>}
        {mood === "nudge" && <path className="cat-paw wave" d="M84 84q12-6 12-20" stroke={INK} strokeWidth="8" strokeLinecap="round" fill="none" />}
        <g className="cat-head">
          <path d="M36 40L38 16 54 30M84 40L82 16 66 30" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M41 33l1-10 7 6M79 33l-1-10-7 6" fill={PINK} opacity=".55" />
          <ellipse cx="60" cy="52" rx="27" ry="23" fill={INK} />
          {eyes}
          <path d="M57.5 54.5h5l-2.5 2.6z" fill={PINK} />
          {mouth}
          <ellipse cx="44" cy="58" rx="4.4" ry="2.6" fill={PINK} opacity=".7" />
          <ellipse cx="76" cy="58" rx="4.4" ry="2.6" fill={PINK} opacity=".7" />
          <path d="M34 54h-9M34 58l-8 2M86 54h9M86 58l8 2" stroke="#3A3236" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      </g>
      {mood === "sleepy" && <g className="cat-z" fill="#FFF7E6" fontFamily="Quicksand, sans-serif" fontWeight="700">
        <text x="86" y="30" fontSize="13">z</text><text x="96" y="18" fontSize="10">z</text><text x="104" y="9" fontSize="8">z</text></g>}
      {mood === "happy" && <g className="cat-hearts" fill={PINK}>
        <path d="M96 30c-3-4-9-1-6 4l6 5 6-5c3-5-3-8-6-4z" /><path d="M20 26c-2-3-7-1-5 3l5 4 5-4c2-4-3-6-5-3z" /></g>}
      {mood === "cheer" && <g className="cat-confetti">
        <rect x="14" y="20" width="6" height="10" rx="2" fill="#F2C879" /><rect x="98" y="14" width="6" height="10" rx="2" fill="#A8B58A" />
        <circle cx="26" cy="8" r="3.5" fill="#EFA9BA" /><circle cx="92" cy="40" r="3" fill="#A9B7C6" />
        <path d="M104 52l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#F2B84B" /><path d="M10 50l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#F2B84B" /></g>}
    </svg>
  );
}

export type MascotSay = { mood: CatMood; vi: string; en: string };

/** Mèo đang ở trạng thái nào và nói gì */
export function mascotSays({ hour, streak, todayRatio, sectionDone, yesterdayMissed, celebrate }: {
  hour: number; streak: number; todayRatio: number; sectionDone: boolean; yesterdayMissed: boolean; celebrate?: boolean;
}): MascotSay {
  const milestone = todayRatio >= 0.8 && MILESTONES.includes(streak);
  if (celebrate || milestone) return milestone
    ? { mood: "cheer", vi: `Mốc ${streak} ngày liên tiếp! Niks tự hào về bạn lắm 🎉`, en: `${streak} days in a row! Niks is so proud of you 🎉` }
    : { mood: "cheer", vi: "Xong routine rồi! Da cảm ơn bạn đó ✨", en: "Routine done! Your skin says thank you ✨" };
  if (hour >= 22 || hour < 5) return sectionDone
    ? { mood: "sleepy", vi: "Da đã được chăm xong. Ngủ ngon nha…", en: "Skin's all cared for. Sweet dreams…" }
    : { mood: "sleepy", vi: "Khuya rồi… rửa mặt + dưỡng ẩm thôi cũng được nè.", en: "It's late… just cleanse + moisturise tonight." };
  if (sectionDone) return { mood: "happy", vi: streak > 1 ? `Tuyệt! Chuỗi ${streak} ngày vẫn giữ vững.` : "Tuyệt vời, xong rồi đó!", en: streak > 1 ? `Yay! Your ${streak}-day streak lives on.` : "Yay, all done!" };
  if (streak > 0) {
    const next = MILESTONES.find((m) => m > streak) ?? streak + 1;
    return { mood: "idle", vi: `Còn ${next - streak} ngày nữa là tới mốc ${next} ngày. Cố lên!`, en: `${next - streak} more day${next - streak > 1 ? "s" : ""} to your ${next}-day milestone!` };
  }
  if (yesterdayMissed) return { mood: "nudge", vi: "Hôm qua lỡ mất rồi, không sao! Bắt đầu lại từ hôm nay nhé.", en: "Missed yesterday? No worries, start fresh today." };
  return { mood: "idle", vi: hour < 12 ? "Chào buổi sáng! Bắt đầu routine cùng Niks nhé." : "Hôm nay da bạn thế nào?", en: hour < 12 ? "Good morning! Let's do your routine together." : "How's your skin today?" };
}
