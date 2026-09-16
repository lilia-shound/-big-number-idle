/**
 * tests/notations.test.ts
 * 阶段 2：表示法解锁系统测试。
 * - 门槛值必须可解析且单调递增
 * - checkUnlocks 按累计产出正确返回新解锁阶段
 * - getNotationFor 返回正确的当前表示法
 */

import { describe, it, expect } from "vitest";
import { D } from "../src/core/bigNum";
import {
  NOTATION_STAGES,
  unlockThreshold,
  getNotationFor,
  getStageById,
  checkUnlocks,
} from "../src/game/notations";

describe("unlockThreshold 门槛", () => {
  it("所有门槛可解析（非 NaN 且有限）", () => {
    for (const stage of NOTATION_STAGES) {
      const th = unlockThreshold(stage);
      if (th === null) continue; // ordinal 由转生层数控制
      expect(th.isFinite(), stage.id).toBe(true);
    }
  });

  it("常规阶段门槛严格单调递增", () => {
    const ids = ["scientific", "tower", "hyperop", "arrow", "chain"];
    for (let i = 1; i < ids.length; i++) {
      const prev = unlockThreshold(getStageById(ids[i - 1]))!;
      const cur = unlockThreshold(getStageById(ids[i]))!;
      expect(cur.gt(prev), `${ids[i]} > ${ids[i - 1]}`).toBe(true);
    }
  });

  it("ordinal 门槛为 null（阶段 3 接入）", () => {
    expect(unlockThreshold(getStageById("ordinal"))).toBeNull();
  });
});

describe("checkUnlocks 解锁判定", () => {
  it("初始只有 plain，小额产出不额外解锁", () => {
    expect(checkUnlocks(["plain"], D(999))).toEqual([]);
  });

  it("累计产出到 1e6 解锁科学计数法", () => {
    const fresh = checkUnlocks(["plain"], D(1e6));
    expect(fresh.map((s) => s.id)).toEqual(["scientific"]);
  });

  it("按顺序解锁多个表示法", () => {
    const fresh = checkUnlocks(["plain"], D("1e1e100"));
    expect(fresh.map((s) => s.id)).toEqual(["scientific", "tower", "hyperop", "arrow"]);
  });

  it("已解锁的不会重复返回", () => {
    const fresh = checkUnlocks(["plain", "scientific", "tower"], D("1e1e100"));
    expect(fresh.map((s) => s.id)).toEqual(["hyperop", "arrow"]);
  });

  it("ordinal 不会仅由数值解锁", () => {
    const fresh = checkUnlocks(["plain", "scientific", "tower", "hyperop", "arrow", "chain"], D("10^^1e6"));
    expect(fresh.map((s) => s.id)).toEqual([]);
  });

  it("序数转生后（ordinalLevel ≥ 1）解锁 ordinal", () => {
    const fresh = checkUnlocks(["plain", "scientific", "tower", "hyperop", "arrow", "chain"], D(0), 1);
    expect(fresh.map((s) => s.id)).toEqual(["ordinal"]);
  });

  it("ordinalLevel 为 0 时不解锁 ordinal", () => {
    const fresh = checkUnlocks(["plain", "scientific", "tower", "hyperop", "arrow", "chain"], D("1e1e300"), 0);
    expect(fresh.map((s) => s.id)).toEqual([]);
  });
});

describe("getNotationFor 当前表示法", () => {
  it("小数/普通数 → plain", () => {
    expect(getNotationFor(D(123)).id).toBe("plain");
  });

  it("1e6 → scientific", () => {
    expect(getNotationFor(D(1e6)).id).toBe("scientific");
  });

  it("10^1000 → tower", () => {
    expect(getNotationFor(D("1e1000")).id).toBe("tower");
  });

  it("1e1e100 → arrow", () => {
    expect(getNotationFor(D("1e1e100")).id).toBe("arrow");
  });

  it("1e1e308 → chain", () => {
    expect(getNotationFor(D("1e1e308")).id).toBe("chain");
  });
});
