/**
 * game/rebirth.ts
 * 转生系统两层：
 * 1. 普通转生：数字达 1e100，重置资源按累计产出结算层级点，购买永久 +10%。
 * 2. 序数转生（终极转生）：累计产出达 10↑↑5（解锁链式箭头）后开放，
 *    进入"序数领域"，获得序数等级并解锁序数表示法（ε₀ / Γ₀ ...）。
 *
 * 序数等级提供海量产出加成（×10^100 / 级），使转生后快速重回高端，
 * 形成"爬塔"节奏；已解锁表示法在序数转生后保留。
 */

import Decimal from "break_eternity.js";
import { D, ZERO, ONE } from "../core/bigNum";

/** 普通转生门槛：1e100 */
export const REBIRTH_THRESHOLD: Decimal = D("1e100");
/** 每 100 个数量级累计 1 层级点 */
const POINTS_PER_ORDER = 100;
/** 单次转生层级点封顶（配合软上限，防数字冲过头导致点数爆炸） */
const MAX_POINTS_PER_REBIRTH = 2;

/** 序数转生门槛：累计产出 ≥ 10↑↑5（链式箭头表示法解锁后开放） */
export const ORDINAL_THRESHOLD: Decimal = D("10^^5");

/** 层级点永久升级：每级 +10% 产出，价格为逐级递增的层级点 */
export const PERMANENT_UPGRADE_COST = (level: number): Decimal => D(2).pow(level);

/** 序数等级对应的序数名（0 未进入序数领域） */
const ORDINAL_NAMES: string[] = [
  "",
  "ε₀",
  "ζ₀",
  "Γ₀",
  "φ(ω,0)",
  "ω₁^CK",
  "TREE(3)",
  "Rayo(10^100)",
];

/** 序数等级名：1→ε₀，2→ζ₀，... 超出列表用 ε[n] 兜底 */
export function ordinalName(level: number): string {
  if (level <= 0) return "—";
  if (level < ORDINAL_NAMES.length) return ORDINAL_NAMES[level];
  return `ε[${level}]`;
}

/** 序数加成倍率：每级 ×10^100（跨数量级的跃升，突破 break_eternity 前感受序数威能） */
export function ordinalMult(level: number): Decimal {
  if (level <= 0) return ONE;
  return D(10).pow(level * 100);
}

export interface RebirthResult {
  layerPoints: Decimal;
  permanentMult: Decimal;
}

/** 按累计产出计算本次转生获得的层级点：floor(log10(totalEarned) / 100)，单次封顶 2 点 */
export function pointsFromTotal(totalEarned: Decimal): Decimal {
  if (totalEarned.lt(ONE)) return ZERO;
  const orders = totalEarned.log10().toNumber();
  const raw = Math.max(0, Math.floor(orders / POINTS_PER_ORDER));
  return D(Math.min(raw, MAX_POINTS_PER_REBIRTH));
}

/** 永久加成倍率：1.1^level */
export function permanentMult(level: number): Decimal {
  return D(1.1).pow(level);
}

/** 综合产出倍率：永久加成 × 序数加成 */
export function totalMult(permLevel: number, ordinalLevel: number): Decimal {
  return permanentMult(permLevel).mul(ordinalMult(ordinalLevel));
}

/** 执行普通转生：根据累计产出结算层级点，返回新的基础状态（数字/生成器/升级重置） */
export function doRebirth(totalEarned: Decimal, curPoints: Decimal, curLevel: number): RebirthResult & {
  gained: Decimal;
  newPoints: Decimal;
  newLevel: number;
} {
  const gained = pointsFromTotal(totalEarned);
  const newPoints = curPoints.add(gained);
  const newLevel = curLevel;
  return {
    gained,
    layerPoints: gained,
    newPoints,
    newLevel,
    permanentMult: permanentMult(newLevel),
  };
}

/** 是否可以普通转生 */
export function canRebirth(num: Decimal): boolean {
  return num.gte(REBIRTH_THRESHOLD);
}

/** 是否可以序数转生：累计产出达到 10↑↑5 */
export function canOrdinalRebirth(totalEarned: Decimal): boolean {
  return totalEarned.gte(ORDINAL_THRESHOLD);
}
