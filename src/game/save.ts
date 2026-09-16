/**
 * game/save.ts
 * 存档：localStorage 序列化（版本化 + 容错），含离线收益结算。
 */

import Decimal from "break_eternity.js";
import { D, ZERO } from "../core/bigNum";
import { tick, TickContext } from "./generators";

export const SAVE_KEY = "big-number-idle-save";
export const SAVE_VERSION = 1;

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
  /** 上次存档时间戳（ms） */
  lastSaved: number;
  /** 是否刚刚结算过离线收益（避免重复） */
  offlineApplied: boolean;
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
    lastSaved: Date.now(),
    offlineApplied: false,
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
    if (obj.version !== SAVE_VERSION) return null;
    return {
      ...initialState(),
      ...obj,
      number: D(obj.number ?? "0"),
      totalEarned: D(obj.totalEarned ?? "0"),
      clickPower: D(obj.clickPower ?? "1"),
      layerPoints: D(obj.layerPoints ?? "0"),
      upgrades: Array.isArray(obj.upgrades) ? obj.upgrades : [],
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
    permanentMult: D(1.1).pow(state.permanentLevel),
  };
}

/**
 * 离线收益结算：按最后一次在线时的每秒产出 × 离线时长（上限 8h）× 倍率。
 * 返回 (结算后的 number 增量, 离线时长秒数, 倍率)。
 */
export function computeOffline(state: GameState, now: number): { gain: Decimal; seconds: number; mult: number } {
  const elapsed = Math.max(0, now - state.lastSaved);
  if (elapsed === 0) return { gain: ZERO, seconds: 0, mult: 0 };
  const capped = Math.min(elapsed, OFFLINE_CAP_MS);
  const seconds = capped / 1000;
  const mult = state.upgrades.includes("offlinex2") ? OFFLINE_UPGRADED_MULT : OFFLINE_BASE_MULT;
  const ctx = makeTickContext(state);
  // 用 1 秒产出估算，再乘离线时长与倍率
  const oneSec = tick(state.number, ctx).sub(state.number);
  const gain = oneSec.mul(seconds).mul(mult).max(ZERO);
  return { gain, seconds, mult };
}
