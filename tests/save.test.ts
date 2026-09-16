/**
 * tests/save.test.ts
 * 存档系统验证：序列化往返、损坏容错、离线收益结算。
 * node 环境无 localStorage，测试内用内存 mock。
 */

import { describe, it, expect, beforeEach } from "vitest";
import { D } from "../src/core/bigNum";
import {
  initialState,
  serialize,
  deserialize,
  computeOffline,
  makeTickContext,
  OFFLINE_CAP_MS,
} from "../src/game/save";

/** 内存版 localStorage */
const storage = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
};

describe("serialize / deserialize", () => {
  it("Decimal 字段往返无损", () => {
    const s = initialState();
    s.number = D("1e100");
    s.totalEarned = D("1e250");
    s.layerPoints = D("3");
    s.counts = { gen1: 5, gen2: 2, gen3: 1 };
    s.upgrades = ["clickx2", "gen2x15"];
    const loaded = deserialize(serialize(s))!;
    expect(loaded.number.eq(D("1e100"))).toBe(true);
    expect(loaded.totalEarned.eq(D("1e250"))).toBe(true);
    expect(loaded.counts).toEqual({ gen1: 5, gen2: 2, gen3: 1 });
    expect(loaded.upgrades).toEqual(["clickx2", "gen2x15"]);
  });

  it("损坏数据返回 null", () => {
    expect(deserialize("not json")).toBeNull();
    expect(deserialize(JSON.stringify({ version: 999 }))).toBeNull();
  });

  it("v1/v2 旧档迁移：ordinalLevel 兜底为 0", () => {
    const v2 = {
      version: 2,
      number: "1e50",
      totalEarned: "1e100",
      clickPower: "1",
      counts: { gen1: 3, gen2: 1, gen3: 0 },
      upgrades: ["clickx2"],
      layerPoints: "1",
      permanentLevel: 1,
      rebirths: 2,
      unlockedNotations: ["plain", "scientific"],
      lastSaved: Date.now(),
      offlineApplied: false,
    };
    const loaded = deserialize(JSON.stringify(v2))!;
    expect(loaded.ordinalLevel).toBe(0);
    expect(loaded.unlockedNotations).toEqual(["plain", "scientific"]);
    expect(loaded.number.eq(D("1e50"))).toBe(true);
  });

  it("v3 存档保留 ordinalLevel", () => {
    const s3 = initialState();
    s3.ordinalLevel = 3;
    const loaded = deserialize(serialize(s3))!;
    expect(loaded.ordinalLevel).toBe(3);
  });

  it("unlockedNotations 去重且至少含 plain", () => {
    const s = initialState();
    s.unlockedNotations = ["plain", "scientific", "scientific", "plain"];
    const loaded = deserialize(serialize(s))!;
    expect(loaded.unlockedNotations).toEqual(["plain", "scientific"]);
  });

  it("旧档中残留的 offlineApplied 字段被忽略", () => {
    const v3 = {
      version: 3,
      number: "1e50",
      totalEarned: "1e100",
      clickPower: "1",
      counts: { gen1: 3, gen2: 1, gen3: 0 },
      upgrades: ["clickx2"],
      layerPoints: "1",
      permanentLevel: 1,
      rebirths: 2,
      unlockedNotations: ["plain", "scientific"],
      ordinalLevel: 0,
      lastSaved: Date.now(),
      offlineApplied: true,
    };
    const loaded = deserialize(JSON.stringify(v3))!;
    expect((loaded as unknown as Record<string, unknown>).offlineApplied).toBeUndefined();
  });
});

describe("computeOffline", () => {
  beforeEach(() => storage.clear());

  it("无离线时长收益为 0", () => {
    const s = initialState();
    const r = computeOffline(s, s.lastSaved);
    expect(r.gain.eq(0)).toBe(true);
    expect(r.seconds).toBe(0);
  });

  it("按每秒产出 × 时长 × 2x 计算", () => {
    const s = initialState();
    s.number = D(100);
    s.counts = { gen1: 3, gen2: 0, gen3: 0 }; // 每秒 +3
    const now = s.lastSaved + 10_000; // 10 秒
    const r = computeOffline(s, now);
    expect(r.seconds).toBe(10);
    expect(r.mult).toBe(2);
    expect(r.gain.toString()).toBe("60"); // 3 × 10 × 2
  });

  it("上限 8 小时", () => {
    const s = initialState();
    s.counts = { gen1: 1, gen2: 0, gen3: 0 };
    const now = s.lastSaved + OFFLINE_CAP_MS + 3600_000; // 9 小时
    const r = computeOffline(s, now);
    expect(r.seconds).toBe(OFFLINE_CAP_MS / 1000);
  });

  it("升级 offlinex2 后倍率 4x", () => {
    const s = initialState();
    s.number = D(100);
    s.counts = { gen1: 3, gen2: 0, gen3: 0 };
    s.upgrades = ["offlinex2"];
    const now = s.lastSaved + 10_000;
    const r = computeOffline(s, now);
    expect(r.mult).toBe(4);
    expect(r.gain.toString()).toBe("120");
  });

  it("幂型生成器（gen3）逐 tick 模拟，收益高于线性估算", () => {
    const s = initialState();
    s.number = D(10);
    s.counts = { gen1: 0, gen2: 0, gen3: 1 }; // 每秒 ^1.1
    const now = s.lastSaved + 5_000; // 5 秒
    const r = computeOffline(s, now);
    // 线性估算：1 秒产出(10^1.1-10≈2.59) × 5 × 2 ≈ 25.9
    // 逐 tick 因底数不断增长，收益显著更高（≈130+）
    expect(r.gain.gt(D(100))).toBe(true);
    expect(r.gain.lt(D(200))).toBe(true);
  });
});

describe("makeTickContext", () => {
  it("带出永久加成与升级集合", () => {
    const s = initialState();
    s.permanentLevel = 2;
    s.upgrades = ["clickx2"];
    const ctx = makeTickContext(s);
    expect(ctx.permanentMult.toNumber()).toBeCloseTo(1.21, 5);
    expect(ctx.upgrades.has("clickx2")).toBe(true);
  });
});
