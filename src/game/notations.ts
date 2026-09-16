/**
 * game/notations.ts
 * 表示法阶段表：核心玩法路线。
 *
 * 每一阶段 = 一种"更大的数学语言"：
 * 普通数 → 科学计数法 → 指数塔 → 超运算 → 多箭头 → 链式箭头 → 序数/递归
 *
 * 阶段 0 定义数据结构，阶段 2 接入解锁系统与教程弹窗。
 * 解锁判定基于累计产出（totalEarned），转生不会丢失已解锁表示法。
 */

import Decimal from "break_eternity.js";
import type { DecimalSource } from "break_eternity.js";
import { D } from "../core/bigNum";

export type NotationId =
  | "plain"
  | "scientific"
  | "tower"
  | "hyperop"
  | "arrow"
  | "chain"
  | "ordinal";

export interface NotationStage {
  id: NotationId;
  /** 显示名称 */
  name: string;
  /** 示例：如 1.23e45、10↑↑4 */
  example: string;
  /** 解锁条件的展示文本（人类可读，不参与运算） */
  unlockAt: string;
  /** 给玩家的一句话教程 */
  tutorial: string;
}

export const NOTATION_STAGES: NotationStage[] = [
  {
    id: "plain",
    name: "普通数",
    example: "1, 1000, 999,999",
    unlockAt: "初始解锁",
    tutorial: "这就是你熟悉的数字。点击按钮或购买生成器让它变大。",
  },
  {
    id: "scientific",
    name: "科学计数法",
    example: "1.23e45",
    unlockAt: "1e6",
    tutorial: "数字太大了？我们换一种写法：1.23e45 = 1.23 × 10^45。",
  },
  {
    id: "tower",
    name: "指数塔",
    example: "10^10^10",
    unlockAt: "1e1000",
    tutorial: "10^10^10 表示 10 的 (10 的 10 次方) 次方。指数自己都变成了大数。",
  },
  {
    id: "hyperop",
    name: "超运算",
    example: "10↑↑4",
    unlockAt: "10↑↑4",
    tutorial: "↑↑ 是迭代幂：10↑↑4 = 10^(10^(10^10))。指数塔开始堆叠。",
  },
  {
    id: "arrow",
    name: "多箭头",
    example: "10↑↑↑10",
    unlockAt: "10↑↑↑10",
    tutorial: "三个箭头：把迭代幂再迭代。这是超越指数塔的巨大结构。",
  },
  {
    id: "chain",
    name: "链式箭头",
    example: "10→10→10",
    unlockAt: "10→10→10",
    tutorial: "康威链式箭头，比多箭头再大一个数量级。",
  },
  {
    id: "ordinal",
    name: "序数/递归",
    example: "ε0, Γ0",
    unlockAt: "终极转生",
    tutorial: "终极转生后进入序数领域。这不是数值，是数学结构的层数。",
  },
];

/**
 * 每个阶段的数值门槛（参与比较）。
 * plain 恒为 0；ordinal 由转生层数控制（阶段 3 接入），返回 null。
 * 注意：10↑↑N 等大数无法用原生 number 表示，必须走 break_eternity。
 */
export function unlockThreshold(stage: NotationStage): Decimal | null {
  switch (stage.id) {
    case "plain":
      return D(0);
    case "scientific":
      return D(1e6);
    case "tower":
      return D("1e1e3"); // 10^1000：指数塔入口
    case "hyperop":
      return D("10^^3"); // 10↑↑3 = 10^(10^10)
    case "arrow":
      return D("10^^4"); // 10↑↑4
    case "chain":
      return D("10^^5"); // 10↑↑5
    case "ordinal":
      return null;
  }
}

/** 获取当前数字对应的表示法阶段（从高到低匹配；ordinal 阶段由转生层数控制，此处跳过） */
export function getNotationFor(value: DecimalSource): NotationStage {
  const v = new Decimal(value);
  for (let i = NOTATION_STAGES.length - 1; i >= 0; i--) {
    const stage = NOTATION_STAGES[i];
    const th = unlockThreshold(stage);
    if (th === null) continue;
    if (v.gte(th)) return stage;
  }
  return NOTATION_STAGES[0];
}

/** 按 id 取阶段 */
export function getStageById(id: string): NotationStage {
  return NOTATION_STAGES.find((s) => s.id === id) ?? NOTATION_STAGES[0];
}

/**
 * 检查累计产出是否跨过尚未解锁的表示法门槛。
 * ordinal 阶段由序数转生层数控制（ordinalLevel ≥ 1 解锁，阶段 3）。
 * @param unlocked 已解锁 id 列表
 * @param totalEarned 累计产出
 * @param ordinalLevel 序数等级（序数转生次数）
 * @returns 新解锁的阶段列表（按顺序，不含已解锁项）
 */
export function checkUnlocks(
  unlocked: string[],
  totalEarned: DecimalSource,
  ordinalLevel = 0
): NotationStage[] {
  const have = new Set(unlocked);
  const out: NotationStage[] = [];
  for (const stage of NOTATION_STAGES) {
    if (have.has(stage.id)) continue;
    const th = unlockThreshold(stage);
    if (th !== null && new Decimal(totalEarned).gte(th)) {
      out.push(stage);
      have.add(stage.id);
    } else if (th === null && stage.id === "ordinal" && ordinalLevel >= 1) {
      out.push(stage);
      have.add(stage.id);
    }
  }
  return out;
}

/**
 * 当前已解锁的最高表示法（表示法面板主展示）。
 * 转生/序数转生不影响已解锁列表，因此显示的是"路线进度"而非当前数值阶段。
 * @returns 阶段；unlocked 为空时返回 plain
 */
export function getTopUnlockedNotation(unlocked: string[]): NotationStage {
  for (let i = NOTATION_STAGES.length - 1; i >= 0; i--) {
    if (unlocked.includes(NOTATION_STAGES[i].id)) return NOTATION_STAGES[i];
  }
  return NOTATION_STAGES[0];
}
