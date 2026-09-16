/**
 * tests/rebirth.test.ts
 * 转生系统验证：1e100 门槛、层级点结算、永久加成。
 */

import { describe, it, expect } from "vitest";
import { D } from "../src/core/bigNum";
import {
  canRebirth,
  pointsFromTotal,
  permanentMult,
  doRebirth,
  PERMANENT_UPGRADE_COST,
  REBIRTH_THRESHOLD,
} from "../src/game/rebirth";

describe("canRebirth", () => {
  it("低于 1e100 不可转生", () => {
    expect(canRebirth(D(1e99))).toBe(false);
  });

  it("达到 1e100 可转生", () => {
    expect(canRebirth(REBIRTH_THRESHOLD)).toBe(true);
    expect(canRebirth(D(1e120))).toBe(true);
  });
});

describe("pointsFromTotal", () => {
  it("按每 100 数量级结算 1 点", () => {
    expect(pointsFromTotal(D(1e100)).toString()).toBe("1");
    expect(pointsFromTotal(D(1e250)).toString()).toBe("2");
    expect(pointsFromTotal(D(1e99)).toString()).toBe("0");
  });

  it("单次层级点封顶 2，防转生点数爆炸", () => {
    // 若无封顶，1e300 / 1e1e6 会结算出天文数字层级点
    expect(pointsFromTotal(D(1e300)).toString()).toBe("2");
    expect(pointsFromTotal(D("1e1e6")).toString()).toBe("2");
  });
});

describe("doRebirth", () => {
  it("结算层级点并保留永久等级", () => {
    const r = doRebirth(D(1e100), D(0), 0);
    expect(r.gained.toString()).toBe("1");
    expect(r.newPoints.toString()).toBe("1");
    expect(r.newLevel).toBe(0);
  });

  it("累计已有层级点", () => {
    const r = doRebirth(D(1e100), D(3), 2);
    expect(r.newPoints.toString()).toBe("4");
    expect(r.permanentMult.toNumber()).toBeCloseTo(1.21, 5);
  });
});

describe("permanentMult", () => {
  it("每级 +10%（乘法）", () => {
    expect(permanentMult(0).toNumber()).toBeCloseTo(1, 5);
    expect(permanentMult(1).toNumber()).toBeCloseTo(1.1, 5);
    expect(permanentMult(3).toNumber()).toBeCloseTo(1.331, 5);
  });
});

describe("PERMANENT_UPGRADE_COST", () => {
  it("价格 1,2,4,8…", () => {
    expect(PERMANENT_UPGRADE_COST(0).toString()).toBe("1");
    expect(PERMANENT_UPGRADE_COST(2).toString()).toBe("4");
  });
});
