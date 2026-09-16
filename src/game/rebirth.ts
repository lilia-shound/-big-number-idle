/**
 * game/rebirth.ts
 * 转生系统：数字达到 1e100 可转生，重置资源并按累计产出结算层级点。
 * 层级点可购买永久 +10% 产出。
 */

import Decimal from "break_eternity.js";
import { D, ZERO, ONE } from "../core/bigNum";

/** 转生门槛：1e100 */
export const REBIRTH_THRESHOLD: Decimal = D("1e100");
/** 每 100 个数量级累计 1 层级点 */
const POINTS_PER_ORDER = 100;

/** 层级点永久升级：每级 +10% 产出，价格为逐级递增的层级点 */
export const PERMANENT_UPGRADE_COST = (level: number): Decimal => D(2).pow(level);

export interface RebirthResult {
  layerPoints: Decimal;
  permanentMult: Decimal;
}

/** 按累计产出计算本次转生获得的层级点：floor(log10(totalEarned) / 100) */
export function pointsFromTotal(totalEarned: Decimal): Decimal {
  if (totalEarned.lt(ONE)) return ZERO;
  const orders = totalEarned.log10().toNumber();
  return D(Math.max(0, Math.floor(orders / POINTS_PER_ORDER)));
}

/** 永久加成倍率：1.1^level */
export function permanentMult(level: number): Decimal {
  return D(1.1).pow(level);
}

/** 执行转生：根据累计产出结算层级点，返回新的基础状态（数字/生成器/升级重置） */
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

/** 是否可以转生 */
export function canRebirth(num: Decimal): boolean {
  return num.gte(REBIRTH_THRESHOLD);
}
