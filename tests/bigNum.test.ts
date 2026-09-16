/**
 * 大数封装冒烟测试：验证 break_eternity.js 接入正确。
 */

import { describe, expect, it } from "vitest";
import Decimal from "break_eternity.js";
import {
  D,
  ZERO,
  ONE,
  TEN,
  MILLION,
  log10,
  cmp,
  eq,
  serialize,
  deserialize,
  cmpLayer,
  type LayerInfo,
} from "../src/core/bigNum";

describe("bigNum 封装", () => {
  it("构造与常量", () => {
    expect(D(42).toString()).toBe("42");
    expect(D("1e100").toString()).toBe("1e100");
    expect(ZERO.toString()).toBe("0");
    expect(ONE.toString()).toBe("1");
    expect(TEN.toString()).toBe("10");
    expect(MILLION.toString()).toBe("1000000");
  });

  it("超过原生 Number 上限仍可表示（核心价值）", () => {
    const x = new Decimal(10).pow(new Decimal(1000)); // 10^1000
    expect(x.isFinite()).toBe(true);
    expect(x.layer).toBe(1);
    expect(x.exponent).toBe(1000);
    // 原生 number 在此处已是 Infinity
    expect(10 ** 1000).toBe(Infinity);
  });

  it("指数塔级别", () => {
    const t = new Decimal(10).tetrate(4); // 10^^4
    expect(t.layer).toBe(2);
    expect(t.mag).toBe(1e10);
  });

  it("运算（容差比较：库存在浮点尾差）", () => {
    expect(D(5).add(3).toString()).toBe("8");
    expect(D(10).mul(10).toString()).toBe("100");
    expect(D(2).pow(10).sub(1024).abs().lt(1e-9)).toBe(true);
    expect(log10(D(1000)).sub(3).abs().lt(1e-9)).toBe(true);
  });

  it("比较与相等", () => {
    expect(cmp(D("1e100"), D("1e99"))).toBe(1);
    expect(cmp(D(1), D(1))).toBe(0);
    expect(cmp(D(1), D(2))).toBe(-1);
    expect(eq(D(1), D(1))).toBe(true);
    expect(eq(D(1), D(2))).toBe(false);
  });

  it("序列化往返", () => {
    for (const s of ["0", "12345", "1e100", "1e1e15"]) {
      expect(deserialize(serialize(D(s))).toString()).toBe(D(s).toString());
    }
  });

  it("分层比较", () => {
    const a: LayerInfo = { layer: 2, exp: 10, mant: 1, arrows: 0 };
    const b: LayerInfo = { layer: 2, exp: 20, mant: 1, arrows: 0 };
    const c: LayerInfo = { layer: 2, exp: 20, mant: 1, arrows: 1 };
    expect(cmpLayer(a, b)).toBe(-1);
    expect(cmpLayer(b, a)).toBe(1);
    expect(cmpLayer(b, c)).toBe(-1);
    expect(cmpLayer(c, c)).toBe(0);
  });
});
