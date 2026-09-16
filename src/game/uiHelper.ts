/**
 * game/uiHelper.ts
 * UI 渲染所需的派生计算：复用 save.ts 的上下文构建，
 * 额外提供每秒产出估算。避免 ui.ts 直接耦合游戏规则细节。
 */

import Decimal from "break_eternity.js";
import type { GameState } from "./save";
import { makeTickContext } from "./save";
import { tick, applySoftCap } from "./generators";
import type { TickContext } from "./generators";

export { makeTickContext };
export type { GameState };

/** 每秒产出估算：1 秒 tick 的增量（用于展示），与在线结算一致套软上限 */
export function perSecondTmp(num: Decimal, ctx: TickContext): Decimal {
  return applySoftCap(tick(num, ctx)).sub(num).abs();
}

/** 点击收益：基础 1 × 点击升级（×2 / ×5）× 永久与序数加成，与 onClick 结算保持一致 */
export function calcClickPower(state: GameState): Decimal {
  let power = new Decimal(1);
  if (state.upgrades.includes("clickx2")) power = power.mul(2);
  if (state.upgrades.includes("clickx5")) power = power.mul(5);
  return power.mul(makeTickContext(state).permanentMult);
}
