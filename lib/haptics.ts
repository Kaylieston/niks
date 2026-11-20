/**
 * Rung nhẹ khi chạm.
 * - Android / Chrome: navigator.vibrate.
 * - iPhone: Safari không có API rung. Từ iOS 18, bấm vào <input type="checkbox" switch> tạo ra một "tick" rung của hệ thống,
 *   nên app giữ một công tắc ẩn và bấm hộ nó. iOS cũ hơn thì không rung, mọi thứ khác vẫn chạy bình thường.
 */
let label: HTMLLabelElement | null = null;

function iosSwitch() {
  if (typeof document === "undefined") return null;
  if (label?.isConnected) return label;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.id = "niks-haptic";
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");
  label = document.createElement("label");
  label.htmlFor = input.id;
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden";
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
}

const PATTERN = { light: 8, medium: 14, success: [10, 60, 18], warn: [20, 40, 20] } as const;
export type Haptic = keyof typeof PATTERN;

export function haptic(kind: Haptic = "light") {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator && navigator.vibrate(PATTERN[kind] as any)) return;
    const l = iosSwitch();
    if (!l) return;
    l.click();
    if (kind === "success" || kind === "warn") setTimeout(() => l.click(), 90);
  } catch {}
}
