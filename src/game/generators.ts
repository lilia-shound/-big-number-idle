/**
 * game/generators.ts
 * 3 个生成器：自动 +1 / 自动 ×2 / 自动 ^1.1（升级可增强）。
 *
 * 大数游戏原则：加法只在前中期有意义，指数/超指数才是主力。
 * 所有数值运算走 Decimal，禁止原生 number。
 */

import Decimal from "break_eternity.js";
import { D, ONE } from "../core/bigNum";

export interface GeneratorDef {
  id: string;
  name: string;
  desc: string;
  /** 基础价格 */
  baseCost: Decimal;
  /** 价格增长倍率（每次购买） */
  costMult: Decimal;
}

export const GENERATOR_DEFS: GeneratorDef[] = [
  {
    id: "gen1",
    name: "自动 +1",
    desc: "每秒增加固定数值",
    baseCost: D(25),
    costMult: D(1.6),
  },
  {
    id: "gen2",
    name: "自动 ×2",
    desc: "每秒将数字乘以 2（指数增长）",
    baseCost: D(500),
    costMult: D(4),
  },
  {
    id: "gen3",
    name: "自动 ^1.1",
    desc: "每秒将数字取 1.1 次方（超指数增长）",
    baseCost: D(1e5),
    costMult: D(12),
  },
] as const;

export type GeneratorId = (typeof GENERATOR_DEFS)[number]["id"];

/** 单个生成器的价格（第 n 个） */
export function generatorCost(def: GeneratorDef, owned: number): Decimal {
  return def.baseCost.mul(def.costMult.pow(owned));
}

/**
 * 一帧游戏逻辑（dt 秒）。
 * 传入升级状态与永久加成，返回更新后的 number。
 */
export interface TickContext {
  /** 各生成器数量 */
  counts: Record<GeneratorId, number>;
  /** 升级是否已购买（按 id） */
  upgrades: Set<string>;
  /** 永久产出加成倍率（层级点购买，乘法） */
  permanentMult: Decimal;
}

/** 生成器 1：每秒 +base，受升级 gen1x2 / gen1x10 加成 */
export function tickGen1(num: Decimal, count: number, ctx: TickContext): Decimal {
  if (count <= 0) return num;
  let rate = D(1).mul(count);
  if (ctx.upgrades.has("gen1x2")) rate = rate.mul(2);
  if (ctx.upgrades.has("gen1x10")) rate = rate.mul(10);
  return num.add(rate.mul(ctx.permanentMult));
}

/** 生成器 2：每秒 ×(2^count)，升级 gen2x15 → ×3，gen2x2 → ×4 */
export function tickGen2(num: Decimal, count: number, ctx: TickContext): Decimal {
  if (count <= 0) return num;
  let mult = 2;
  if (ctx.upgrades.has("gen2x15")) mult = 3;
  if (ctx.upgrades.has("gen2x2")) mult = 4;
  return num.mul(D(mult).pow(count));
}

/** 生成器 3：每秒 number^(1.1^count)，升级 gen3x12 → 1.2，gen3x15 → 1.5 */
export function tickGen3(num: Decimal, count: number, ctx: TickContext): Decimal {
  if (count <= 0) return num;
  let base = 1.1;
  if (ctx.upgrades.has("gen3x12")) base = 1.2;
  if (ctx.upgrades.has("gen3x15")) base = 1.5;
  // 小于 1 时开方会变小，先抬到 1
  const n = num.lt(ONE) ? ONE : num;
  return n.pow(D(base).pow(count));
}

/** 综合一帧：gen1 → gen2 → gen3 顺序执行 */
export function tick(num: Decimal, ctx: TickContext): Decimal {
  let n = tickGen1(num, ctx.counts.gen1 ?? 0, ctx);
  n = tickGen2(n, ctx.counts.gen2 ?? 0, ctx);
  n = tickGen3(n, ctx.counts.gen3 ?? 0, ctx);
  return n;
}

/** 每秒产出（用于展示），用 1 秒 tick 估算 */
export function perSecond(num: Decimal, ctx: TickContext): Decimal {
  return tick(num, ctx).sub(num).abs();
}
