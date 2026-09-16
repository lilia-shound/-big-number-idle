/**
 * 格式化边界测试：0、1、负数、NaN、Infinity、各表示法层级。
 */

import { describe, expect, it } from "vitest";
import Decimal from "break_eternity.js";
import { format, formatInt } from "../src/core/format";
import { D } from "../src/core/bigNum";

describe("format 边界", () => {
  it("特殊值", () => {
    expect(format(D(0))).toBe("0");
    expect(format(D(1))).toBe("1");
    expect(format(D(-42))).toBe("-42");
    expect(format(D(-1e50))).toBe("-1e50");
    expect(format(new Decimal("NaN"))).toBe("NaN");
    expect(format(new Decimal(Infinity))).toBe("Infinity");
    expect(format(new Decimal(-Infinity))).toBe("-Infinity");
  });

  it("普通数", () => {
    expect(format(D(999))).toBe("999");
    expect(format(D(1234))).toBe("1,234");
    expect(format(D(999999))).toBe("999,999");
    expect(format(D(3.14))).toBe("3.14");
    expect(format(D(1.5))).toBe("1.5");
  });

  it("科学计数法", () => {
    expect(format(D("1.23e45"))).toBe("1.23e45");
    expect(format(D("1e100"))).toBe("1e100");
    expect(format(D("1e1000"))).toBe("1e1000");
    expect(formatInt(D("1.99e45"))).toBe("2e45");
  });

  it("指数塔嵌套", () => {
    expect(format(D("1e1e15"))).toBe("1e1e15");
    expect(format(D("1e1e1e15"))).toBe("1e1e1e15");
    // 10^^4 = 10^(10^(10^10)) → 1e1e1e10
    expect(format(D(10).tetrate(4))).toBe("1e1e1e10");
  });

  it("useSci=false 时全量千分位（未购买 sci 升级）", () => {
    expect(format(D(999), 2, false)).toBe("999");
    expect(format(D(1234), 2, false)).toBe("1,234");
    expect(format(D(1e6), 2, false)).toBe("1,000,000");
    expect(format(D(1.5), 2, false)).toBe("1.5");
  });
});

describe("format 稳定性", () => {
  it("大数不抛异常且有限", () => {
    for (const s of ["1e308", "1e1e100", "1e1e1e100"]) {
      const out = format(D(s));
      expect(out.length).toBeGreaterThan(0);
    }
  });
});
