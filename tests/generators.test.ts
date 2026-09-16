/**
 * tests/generators.test.ts
 * 3 个生成器行为验证：自动 +1 / 自动 ×2 / 自动 ^1.1，以及升级效果。
 */

import { describe, it, expect } from "vitest";
import { D } from "../src/core/bigNum";
import {
  tick,
  tickGen1,
  tickGen2,
  tickGen3,
  generatorCost,
  GENERATOR_DEFS,
  applySoftCap,
} from "../src/game/generators";

const noUpgrades = new Set<string>();
const ctx = (counts: Record<string, number>, upgrades = noUpgrades, permanentMult = D(1)) => ({
  counts,
  upgrades,
  permanentMult,
});

describe("generatorCost", () => {
  it("价格按倍率递增", () => {
    const g = GENERATOR_DEFS[0];
    expect(generatorCost(g, 0).toString()).toBe("25");
    expect(generatorCost(g, 1).toString()).toBe("40");
    expect(generatorCost(g, 2).toString()).toBe("64");
  });
});

describe("tickGen1 自动+1", () => {
  it("每秒按数量累加", () => {
    const out = tickGen1(D(100), 3, ctx({ gen1: 3 }));
    expect(out.toString()).toBe("103");
  });

  it("升级 gen1x2 / gen1x10 加成", () => {
    const withUp = tickGen1(D(0), 2, ctx({ gen1: 2 }, new Set(["gen1x2", "gen1x10"])));
    expect(withUp.toString()).toBe("40");
  });
});

describe("tickGen2 自动×2", () => {
  it("每秒乘 2^count", () => {
    const out = tickGen2(D(100), 3, ctx({ gen2: 3 }));
    expect(out.toNumber()).toBeCloseTo(800, 5);
  });

  it("升级 gen2x15 → ×3，gen2x2 → ×4", () => {
    const out = tickGen2(D(10), 1, ctx({ gen2: 1 }, new Set(["gen2x15", "gen2x2"])));
    expect(out.toString()).toBe("40");
  });
});

describe("tickGen3 自动^1.1", () => {
  it("每秒取 1.1^count 次方", () => {
    const out = tickGen3(D(1e4), 1, ctx({ gen3: 1 }));
    expect(out.log10().toNumber()).toBeCloseTo(4 * 1.1, 5);
  });

  it("升级 gen3x12 → 1.2，gen3x15 → 1.5", () => {
    const out = tickGen3(D(1e4), 1, ctx({ gen3: 1 }, new Set(["gen3x12", "gen3x15"])));
    expect(out.log10().toNumber()).toBeCloseTo(4 * 1.5, 5);
  });

  it("小于 1 时先抬到 1，避免开方变小", () => {
    const out = tickGen3(D(0.5), 1, ctx({ gen3: 1 }));
    expect(out.gte(1)).toBe(true);
  });
});

describe("tick 综合", () => {
  it("三大生成器同时工作（大数量级）", () => {
    // 模拟中后期：数字 1e10，gen2 若干，验证指数级增长
    let n = D(1e10);
    for (let i = 0; i < 60; i++) {
      n = tick(n, ctx({ gen1: 5, gen2: 2, gen3: 0 }));
    }
    // 每秒 ×4，60 秒：1e10 × 4^60 ≈ 1e46
    expect(n.log10().toNumber()).toBeGreaterThan(40);
  });
});

describe("applySoftCap 软上限", () => {
  it("门槛前不压缩", () => {
    expect(applySoftCap(D(1)).toString()).toBe("1");
    expect(applySoftCap(D(1e90)).toString()).toBe("1e90");
    expect(applySoftCap(D(1e94)).toString()).toBe("1e94");
  });

  it("1e95 起压缩，逼近 1e100 后仍可到达门槛", () => {
    // 原始 log10=98.5 → 压缩后已 ≥ 1e100，可转生
    expect(applySoftCap(D(10).pow(98.5)).log10().toNumber()).toBeGreaterThanOrEqual(100);
    // 原始 log10=100 → 压缩后约 101.3
    const y = applySoftCap(D(10).pow(100)).log10().toNumber();
    expect(y).toBeGreaterThan(100);
    expect(y).toBeLessThan(102);
  });

  it("log10 渐近封顶 1e105，数字永不冲过头", () => {
    // 原始 log10 再大（如 1e4、1e6），压缩后都不超过 1e105
    const cap = applySoftCap(D("1e1e4")).log10().toNumber();
    expect(cap).toBeLessThanOrEqual(105);
    expect(cap).toBeGreaterThan(104.5);
    expect(applySoftCap(D("1e1e6")).log10().toNumber()).toBeLessThanOrEqual(105);
  });

  it("不会因极大数溢出而异常", () => {
    // 数字极大（log10 很大）时压缩结果仍为有效数字
    const out = applySoftCap(D("1e1e100"));
    expect(out.log10().toNumber()).toBeGreaterThan(0);
    expect(out.log10().toNumber()).toBeLessThanOrEqual(105);
  });
});
