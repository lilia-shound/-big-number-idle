/**
 * core/bigNum.ts
 * 大数封装层：基于 break_eternity.js（支持到 10^^1e308）。
 *
 * 阶段 0 职责：
 * - 统一类型别名与构造入口，后续所有数值一律走本模块
 * - 暴露常用运算/比较工具
 * - 预留"层级系统"接口（后期突破 break_eternity 上限时挂载）
 *
 * 禁止在游戏逻辑中直接使用原生 number 做大数运算（10**1000 会变 Infinity）。
 */

import Decimal from "break_eternity.js";
import type { DecimalSource } from "break_eternity.js";

/** 全游戏统一的大数类型 */
export type Num = Decimal;

/** 快捷构造：接受 number / string / Decimal */
export function D(value: DecimalSource = 0): Decimal {
  return new Decimal(value);
}

/** 常量 */
export const ZERO = D(0);
export const ONE = D(1);
export const TEN = D(10);
export const THOUSAND = D(1e3);
export const MILLION = D(1e6);

/** 对数（底数 10） */
export function log10(x: Num): Decimal {
  return D(x).log10();
}

/** 比较：返回 -1 | 0 | 1 */
export function cmp(a: Num, b: Num): number {
  return D(a).cmp(D(b));
}

/** 是否相等 */
export function eq(a: Num, b: Num): boolean {
  return D(a).eq(D(b));
}

/** 序列化：存储为字符串，禁止直接 JSON 化 Decimal 对象（不同版本结构不兼容） */
export function serialize(x: Num): string {
  return D(x).toString();
}

/** 反序列化 */
export function deserialize(s: string): Decimal {
  return D(s);
}

/**
 * 层级信息（阶段 3 起启用）：
 * 当数值突破 break_eternity 可表示上限（10^^1e308）后，
 * 在此之上叠加"指数塔层数 / 箭头数"分层结构。
 * 阶段 0 仅定义类型与接口，不实现。
 */
export interface LayerInfo {
  /** 指数塔层数：0=普通数，1=10^x，2=10^10^x */
  layer: number;
  /** 当前层指数 */
  exp: number;
  /** 尾数 1~10 */
  mant: number;
  /** 箭头数：0=普通幂，1=↑，2=↑↑，3=↑↑↑ */
  arrows: number;
}

/** 比较分层数（先比箭头，再比层，再比 exp，再比 mant） */
export function cmpLayer(a: LayerInfo, b: LayerInfo): number {
  if (a.arrows !== b.arrows) return a.arrows < b.arrows ? -1 : 1;
  if (a.layer !== b.layer) return a.layer < b.layer ? -1 : 1;
  if (a.exp !== b.exp) return a.exp < b.exp ? -1 : 1;
  if (a.mant !== b.mant) return a.mant < b.mant ? -1 : 1;
  return 0;
}
