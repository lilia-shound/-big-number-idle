/**
 * core/format.ts
 * 大数格式化：UI 的核心体验。
 *
 * 阶段 0 实现基础格式化：
 * - 普通数（< 1e6）：千分位
 * - 科学计数法（layer 1）：1.23e45 / 1e1e15（指数过大时嵌套）
 * - 指数塔（layer 2+）：递归嵌套 1e1e1e15
 *
 * 边界必须全覆盖：0、1、负数、NaN、Infinity、极小值。
 */

import Decimal from "break_eternity.js";
import { D } from "./bigNum";

const THRESHOLD = D(1e6); // 超过此值进入科学计数法
const NEST_THRESHOLD = 1e6; // 指数超过此值时嵌套显示（1e1e15 而非 1e1000000）

/** 普通数显示（x < 1e6） */
function formatPlain(x: Decimal): string {
  if (x.isNan()) return "NaN";
  const n = x.toNumber();
  if (n >= 1000) {
    return Math.floor(n).toLocaleString("en-US");
  }
  if (Number.isInteger(n)) {
    return String(n);
  }
  // 小数保留最多 2 位，去尾零
  return n.toFixed(2).replace(/\.?0+$/, "");
}

/** 尾数格式化：1.00 → 1，1.20 → 1.2，1.23 → 1.23 */
function formatMantissa(m: number, decimals: number): string {
  return m
    .toFixed(decimals)
    .replace(/\.?0+$/, "");
}

/**
 * 主格式化入口。
 * @param x 要格式化的大数
 * @param decimals 尾数小数位（科学计数法部分）
 */
export function format(x: Decimal, decimals = 2): string {
  if (x.isNan()) return "NaN";
  if (!x.isFinite()) {
    return x.sign < 0 ? "-Infinity" : "Infinity";
  }
  if (x.sign < 0) return "-" + format(x.neg(), decimals);
  if (x.eq(0)) return "0";

  // 普通数
  if (x.lt(THRESHOLD)) {
    return formatPlain(x);
  }

  const m = formatMantissa(x.mantissa, decimals);
  const layer = x.layer;

  if (layer <= 1) {
    const e = x.exponent;
    if (!Number.isFinite(e) || Math.abs(e) >= NEST_THRESHOLD) {
      // 指数太大：嵌套显示 1e1e15
      return `${m}e${format(new Decimal(e), decimals)}`;
    }
    return `${m}e${e}`;
  }

  // layer >= 2：指数部分 = 10^mag（本身是一个 layer 1 的大数），递归一层
  const expDecimal = D(10).pow(x.mag);
  return `${m}e${format(expDecimal, decimals)}`;
}

/** 转生货币等整数场合使用（无小数尾数） */
export function formatInt(x: Decimal): string {
  return format(x, 0);
}
