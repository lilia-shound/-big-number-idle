/**
 * game/uiHelper.ts
 * UI 渲染所需的派生计算：复用 save.ts 的上下文构建，
 * 额外提供每秒产出估算。避免 ui.ts 直接耦合游戏规则细节。
 */

import Decimal from "break_eternity.js";
import type { GameState } from "./save";
import { makeTickContext } from "./save";
import { tick } from "./generators";
import type { TickContext } from "./generators";

export { makeTickContext };
export type { GameState };

/** 每秒产出估算：1 秒 tick 的增量（用于展示） */
export function perSecondTmp(num: Decimal, ctx: TickContext): Decimal {
  return tick(num, ctx).sub(num).abs();
}
