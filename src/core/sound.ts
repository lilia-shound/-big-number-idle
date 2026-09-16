/**
 * core/sound.ts
 * 阶段 4：音效系统。Web Audio API 合成，零外部资源；
 * 首次用户交互后自动解锁（浏览器自动播放策略）。
 * 静音状态持久化到 localStorage。
 */

const MUTE_KEY = "big-number-idle-sound-muted";

let ctx: AudioContext | null = null;
let muted = false;

try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
} catch {
  muted = false;
}

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* 忽略存储失败 */
  }
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** 合成单音：可选频率滑音 */
function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  gain = 0.05,
  delay = 0,
  slideTo?: number
): void {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

/** 音效集：各操作对应的合成音 */
export const sfx = {
  /** 点击：短促方波 */
  click: () => tone(620, 0.06, "square", 0.035),
  /** 购买成功：上行双音 */
  buy: () => {
    tone(520, 0.08, "square", 0.05);
    tone(780, 0.1, "square", 0.04, 0.06);
  },
  /** 表示法解锁：三音琶音 */
  unlock: () => {
    tone(523, 0.12, "triangle", 0.06);
    tone(659, 0.12, "triangle", 0.06, 0.1);
    tone(784, 0.2, "triangle", 0.06, 0.2);
  },
  /** 普通转生：上行滑音 */
  rebirth: () => tone(280, 0.5, "sawtooth", 0.045, 0, 880),
  /** 序数转生：双音长滑音 */
  ordinal: () => {
    tone(196, 0.8, "sawtooth", 0.05, 0, 1046);
    tone(294, 0.8, "sine", 0.05, 0.12, 1318);
  },
  /** 成就解锁：双高音 */
  achievement: () => {
    tone(880, 0.1, "triangle", 0.06);
    tone(1174, 0.28, "triangle", 0.06, 0.1);
  },
};
