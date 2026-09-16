/**
 * tests/achievements.test.ts
 * 成就系统验证：全部 12 个里程碑条件、新解锁返回顺序、已解锁不重复。
 */

import { describe, it, expect } from "vitest";
import { D } from "../src/core/bigNum";
import { ACHIEVEMENTS, checkAchievements, getAchievementById } from "../src/game/achievements";
import type { AchievementState } from "../src/game/achievements";

function base(): AchievementState {
  return {
    clicks: 0,
    counts: { gen1: 0, gen2: 0, gen3: 0 },
    number: D(0),
    rebirths: 0,
    ordinalLevel: 0,
  };
}

const ids = ACHIEVEMENTS.map((a) => a.id);

describe("成就定义", () => {
  it("12 个成就且 id 唯一", () => {
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  it("getAchievementById 命中与未命中", () => {
    expect(getAchievementById("first-click")?.name).toBe("初来乍到");
    expect(getAchievementById("nope")).toBeUndefined();
  });
});

describe("checkAchievements 里程碑", () => {
  it("初始状态无成就", () => {
    expect(checkAchievements(new Set(), base())).toEqual([]);
  });

  it("点击类：1 次与 100 次", () => {
    expect(checkAchievements(new Set(), { ...base(), clicks: 1 }).map((a) => a.id)).toEqual([
      "first-click",
    ]);
    expect(
      checkAchievements(new Set(), { ...base(), clicks: 100 }).map((a) => a.id)
    ).toEqual(["first-click", "click-100"]);
  });

  it("生成器类：首个与任一 ×10", () => {
    const got = checkAchievements(new Set(), { ...base(), counts: { gen1: 1, gen2: 0, gen3: 0 } });
    expect(got.map((a) => a.id)).toEqual(["first-gen"]);
    const got10 = checkAchievements(new Set(), {
      ...base(),
      counts: { gen1: 0, gen2: 10, gen3: 0 },
    });
    expect(got10.map((a) => a.id)).toEqual(["first-gen", "gen-10"]);
  });

  it("数字里程碑：1e6 / 1e100 / 1e1e3 / 1e1e308", () => {
    const cases: Array<[string, string]> = [
      ["1e6", "reach-1e6"],
      ["1e100", "reach-1e100"],
      ["1e1e3", "reach-tower"],
      ["1e1e308", "reach-chain"],
    ];
    for (const [num, id] of cases) {
      const got = checkAchievements(new Set(), { ...base(), number: D(num) });
      expect(got.map((a) => a.id)).toContain(id);
    }
    // 低于门槛不触发
    expect(checkAchievements(new Set(), { ...base(), number: D(999_999) })).toEqual([]);
  });

  it("转生类：1 次与 10 次", () => {
    expect(
      checkAchievements(new Set(), { ...base(), rebirths: 1 }).map((a) => a.id)
    ).toEqual(["first-rebirth"]);
    expect(
      checkAchievements(new Set(), { ...base(), rebirths: 10 }).map((a) => a.id)
    ).toEqual(["first-rebirth", "rebirth-10"]);
  });

  it("序数类：等级 1 与等级 5", () => {
    expect(
      checkAchievements(new Set(), { ...base(), ordinalLevel: 1 }).map((a) => a.id)
    ).toEqual(["first-ordinal"]);
    expect(
      checkAchievements(new Set(), { ...base(), ordinalLevel: 5 }).map((a) => a.id)
    ).toEqual(["first-ordinal", "ordinal-5"]);
  });
});

describe("checkAchievements 去重", () => {
  it("已解锁的成就不再返回", () => {
    const got = checkAchievements(new Set(["first-click", "click-100"]), {
      ...base(),
      clicks: 1000,
    });
    expect(got.map((a) => a.id)).not.toContain("first-click");
    expect(got.map((a) => a.id)).not.toContain("click-100");
  });

  it("转生后数字归零不影响已解锁保留（prev 去重）", () => {
    const prev = new Set(["reach-1e100", "first-rebirth"]);
    const got = checkAchievements(prev, { ...base(), rebirths: 1 });
    expect(got.map((a) => a.id)).toEqual([]);
  });
});
