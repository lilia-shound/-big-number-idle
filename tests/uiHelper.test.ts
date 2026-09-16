/**
 * tests/uiHelper.test.ts
 * UI 派生计算验证：点击收益（与 onClick 一致）、每秒产出估算（套软上限）。
 */

import { describe, it, expect } from "vitest";
import { D } from "../src/core/bigNum";
import { initialState } from "../src/game/save";
import { calcClickPower, perSecondTmp, makeTickContext } from "../src/game/uiHelper";
import { perSecond, SOFT_CAP_LOG } from "../src/game/generators";

describe("calcClickPower", () => {
  it("初始点击力为 1", () => {
    const s = initialState();
    expect(calcClickPower(s).toString()).toBe("1");
  });

  it("升级 clickx2 / clickx5 相乘", () => {
    const s = initialState();
    s.upgrades = ["clickx2", "clickx5"];
    expect(calcClickPower(s).toString()).toBe("10");
  });

  it("受永久与序数加成", () => {
    const s = initialState();
    s.permanentLevel = 2; // 1.1^2 = 1.21
    s.ordinalLevel = 1; // ×1e100
    expect(calcClickPower(s).log10().toNumber()).toBeCloseTo(100 + Math.log10(1.21), 5);
  });
});

describe("perSecondTmp", () => {
  it("压缩带内展示收益套软上限（与在线结算一致）", () => {
    const s = initialState();
    s.counts = { gen1: 0, gen2: 3, gen3: 0 };
    const ctx = makeTickContext(s);
    const num = D(10).pow(96); // 1e96，处于 1e95~1e105 压缩带
    const rawGain = perSecond(num, ctx); // 未压缩增量 = 7e96
    const shown = perSecondTmp(num, ctx);
    expect(rawGain.log10().toNumber()).toBeCloseTo(96 + Math.log10(7), 3);
    expect(shown.gt(0)).toBe(true);
    // 软上限将 tick 后数字压向更高 log10，展示增量落在压缩后空间（明显大于未压缩增量）
    expect(shown.gt(rawGain)).toBe(true);
    expect(shown.log10().toNumber()).toBeLessThan(SOFT_CAP_LOG);
  });

  it("压缩带外展示收益等于真实增量", () => {
    const s = initialState();
    s.counts = { gen1: 3, gen2: 0, gen3: 0 };
    const ctx = makeTickContext(s);
    const num = D(100);
    expect(perSecondTmp(num, ctx).toString()).toBe("3");
  });
});
