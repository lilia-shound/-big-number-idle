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

/** 生成器 2：每秒 ×(2^count)，升级 gen2x15 → ×3，gen2x2 → ×4；结果受永久/序数加成 */
export function tickGen2(num: Decimal, count: number, ctx: TickContext): Decimal {
  if (count <= 0) return num;
  let mult = 2;
  if (ctx.upgrades.has("gen2x15")) mult = 3;
  if (ctx.upgrades.has("gen2x2")) mult = 4;
  return num.mul(D(mult).pow(count)).mul(ctx.permanentMult);
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

// ---------- 软上限（转生门槛压缩带） ----------
/**
 * 接近转生门槛 1e100 时对数字本身做 log10 空间压缩，防止超指数生成器
 * 一口气冲过门槛太远、导致转生层级点结算爆炸。
 * 1e95 起生效，在 log10 95~105 压缩带内数字被压向 1e105；
 * 超过 1e105 解除压缩、数字正常增长（转生点已由 MAX_POINTS_PER_REBIRTH
 * 封顶，解除后不会导致层级点爆炸，玩家可继续冲刺更高表示法）。
 */
export const SOFT_START_LOG = 95; // 1e95 起压缩
export const SOFT_CAP_LOG = 105; // 压缩后的 log10 绝对上限（数字 ≤ 1e105）
export const SOFT_RAMP = 5; // 压缩强度：extra/5 指数衰减

/** 平滑阶跃：t∈[0,1] → [0,1]（smoothstep） */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** 软上限产出倍率：x = log10(num)，仅用于展示衰减曲线 */
export function softCapFactor(num: Decimal): number {
  const x = num.log10().toNumber();
  if (!Number.isFinite(x) || x <= SOFT_START_LOG) return 1;
  if (x > SOFT_CAP_LOG) return 1;
  const t = (x - SOFT_START_LOG) / (SOFT_CAP_LOG - SOFT_START_LOG); // 0~1
  // 单调衰减：在压缩带内从 1 平滑降到 0（表达"数字越接近上限推进越慢"）
  return 1 - smoothstep(t);
}

/**
 * 应用软上限（tick 后调用）：
 * - log10 ≤ 1e95：不压缩，原样返回；
 * - 1e95 ~ 1e105：压缩带，数字被压向 1e105，防止冲过转生门槛后瞬时爆炸；
 * - 超过 1e105：解除压缩，数字正常增长（转生点已有封顶保护，可安心冲刺更高表示法）。
 */
export function applySoftCap(num: Decimal): Decimal {
  const x = num.log10().toNumber();
  if (!Number.isFinite(x) || x <= SOFT_START_LOG) return num;
  if (x > SOFT_CAP_LOG) return num;
  const extra = x - SOFT_START_LOG;
  const y = SOFT_START_LOG + (SOFT_CAP_LOG - SOFT_START_LOG) * (1 - Math.exp(-extra / SOFT_RAMP));
  return D(10).pow(y);
}
