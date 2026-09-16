/**
 * game/save.ts
 * 存档：localStorage 序列化（版本化 + 容错），含离线收益结算。
 *
 * v2：新增 unlockedNotations（已解锁表示法列表），兼容 v1 旧档。
 * v3：新增 ordinalLevel（序数等级，阶段 3 序数转生），兼容 v1/v2。
 * v4：新增 clicks（累计点击）与 achievements（已解锁成就，阶段 4），兼容 v1~v3。
 */

import Decimal from "break_eternity.js";
import { D, ZERO } from "../core/bigNum";
import { tick, TickContext, applySoftCap } from "./generators";
import { totalMult } from "./rebirth";

export const SAVE_KEY = "big-number-idle-save";
export const SAVE_VERSION = 4;

/** 离线收益：上限 8 小时；基础倍率 2x，升级后 4x */
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
const OFFLINE_BASE_MULT = 2;
const OFFLINE_UPGRADED_MULT = 4;

export interface GameState {
  version: number;
  number: Decimal;
  totalEarned: Decimal;
  clickPower: Decimal;
  counts: Record<string, number>;
  upgrades: string[];
  layerPoints: Decimal;
  permanentLevel: number;
  rebirths: number;
  /** 已解锁的表示法 id 列表（至少包含 plain） */
  unlockedNotations: string[];
  /** 序数等级（序数转生次数）：≥1 进入序数领域 */
  ordinalLevel: number;
  /** 上次存档时间戳（ms） */
  lastSaved: number;
  /** 累计点击次数（成就统计，阶段 4） */
  clicks: number;
  /** 已解锁成就 id 列表（跨转生保留，阶段 4） */
  achievements: string[];
}

export function initialState(): GameState {
  return {
    version: SAVE_VERSION,
    number: D(0),
    totalEarned: D(0),
    clickPower: D(1),
    counts: { gen1: 0, gen2: 0, gen3: 0 },
    upgrades: [],
    layerPoints: ZERO,
    permanentLevel: 0,
    rebirths: 0,
    unlockedNotations: ["plain"],
    ordinalLevel: 0,
    lastSaved: Date.now(),
    clicks: 0,
    achievements: [],
  };
}

export function serialize(state: GameState): string {
  return JSON.stringify({
    ...state,
    number: state.number.toString(),
    totalEarned: state.totalEarned.toString(),
    clickPower: state.clickPower.toString(),
    layerPoints: state.layerPoints.toString(),
  });
}

export function deserialize(raw: string): GameState | null {
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    if (obj.version < 1 || obj.version > SAVE_VERSION) return null;
    // 显式挑选字段（而非 spread 旧档），避免残留死字段（如 offlineApplied）混入新状态
    return {
      version: SAVE_VERSION,
      number: D(obj.number ?? "0"),
      totalEarned: D(obj.totalEarned ?? "0"),
      clickPower: D(obj.clickPower ?? "1"),
      counts: {
        gen1: obj.counts?.gen1 ?? 0,
        gen2: obj.counts?.gen2 ?? 0,
        gen3: obj.counts?.gen3 ?? 0,
      },
      upgrades: Array.isArray(obj.upgrades) ? obj.upgrades : [],
      layerPoints: D(obj.layerPoints ?? "0"),
      permanentLevel: typeof obj.permanentLevel === "number" ? obj.permanentLevel : 0,
      rebirths: typeof obj.rebirths === "number" ? obj.rebirths : 0,
      // v1 旧档无此字段，兜底为初始解锁；达标项由 main 启动时 syncUnlocks 补齐
      // 去重 + 保证至少含 plain，避免重复项污染表示法切换
      unlockedNotations: Array.from(
        new Set([
          ...(Array.isArray(obj.unlockedNotations) ? obj.unlockedNotations : []),
          "plain",
        ]),
      ),
      // v1/v2 旧档无此字段，兜底为 0
      ordinalLevel: typeof obj.ordinalLevel === "number" ? obj.ordinalLevel : 0,
      lastSaved: typeof obj.lastSaved === "number" ? obj.lastSaved : Date.now(),
      // v1~v3 旧档无此字段，兜底为 0 / 空（阶段 4）
      clicks: typeof obj.clicks === "number" ? obj.clicks : 0,
      achievements: Array.isArray(obj.achievements)
        ? Array.from(new Set(obj.achievements))
        : [],
    };
  } catch {
    return null;
  }
}

export function saveToStorage(state: GameState): void {
  state.lastSaved = Date.now();
  localStorage.setItem(SAVE_KEY, serialize(state));
}

export function loadFromStorage(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  return deserialize(raw);
}

/** 由主状态生成生成器 tick 上下文 */
export function makeTickContext(state: GameState): TickContext {
  return {
    counts: state.counts,
    upgrades: new Set(state.upgrades),
    permanentMult: totalMult(state.permanentLevel, state.ordinalLevel),
  };
}

/**
 * 离线收益结算：逐秒模拟在线 tick（与在线共享同一套生成器/软上限逻辑），
 * 每 tick 产出额外乘离线倍率，避免 1 秒产出 × 时长 的线性估算
 * 在幂型生成器（gen3）下严重失真。
 * 返回 (结算后的 number 增量, 离线时长秒数, 倍率)。
 */
export function computeOffline(state: GameState, now: number): { gain: Decimal; seconds: number; mult: number } {
  const elapsed = Math.max(0, now - state.lastSaved);
  if (elapsed === 0) return { gain: ZERO, seconds: 0, mult: 0 };
  const capped = Math.min(elapsed, OFFLINE_CAP_MS);
  const seconds = capped / 1000;
  const mult = state.upgrades.includes("offlinex2") ? OFFLINE_UPGRADED_MULT : OFFLINE_BASE_MULT;
  const ctx = makeTickContext(state);
  // 逐 tick 模拟（与在线一致，含软上限）；每 tick 增量 × 离线倍率
  const ticks = Math.max(1, Math.floor(capped / 1000));
  let n = state.number;
  for (let i = 0; i < ticks; i++) {
    const next = tick(n, ctx);
    const gained = next.sub(n).mul(mult).max(ZERO);
    n = applySoftCap(n.add(gained));
  }
  const gain = n.sub(state.number).max(ZERO);
  return { gain, seconds, mult };
}
