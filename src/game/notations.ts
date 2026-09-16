/**
 * game/notations.ts
 * 表示法阶段表：核心玩法路线。
 *
 * 每一阶段 = 一种"更大的数学语言"：
 * 普通数 → 科学计数法 → 指数塔 → 超运算 → 多箭头 → 链式箭头 → 序数/递归
 *
 * 阶段 0 先定义数据结构，解锁逻辑在阶段 2 接入。
 */

import Decimal from "break_eternity.js";
import type { DecimalSource } from "break_eternity.js";

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
  /** 示例：如 1.23e45、10^10^10 */
  example: string;
  /** 解锁条件（用 break_eternity 字符串表示，可比较、可存档） */
  unlockAt: string;
  /** 给玩家的一句话教程 */
  tutorial: string;
}

export const NOTATION_STAGES: NotationStage[] = [
  {
    id: "plain",
    name: "普通数",
    example: "1, 1000, 999,999",
    unlockAt: "0",
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
    unlockAt: "1e1e15",
    tutorial: "10^10^10 表示 10 的 (10 的 10 次方) 次方。指数自己都变成了大数。",
  },
  {
    id: "hyperop",
    name: "超运算",
    example: "10↑↑4",
    unlockAt: "10^^4",
    tutorial: "↑↑ 是迭代幂：10↑↑4 = 10^(10^(10^10))。指数塔开始堆叠。",
  },
  {
    id: "arrow",
    name: "多箭头",
    example: "10↑↑↑10",
    unlockAt: "10^^^10",
    tutorial: "三个箭头：把迭代幂再迭代。转生后解锁。",
  },
  {
    id: "chain",
    name: "链式箭头",
    example: "10→10→10",
    unlockAt: "10->10->10",
    tutorial: "康威链式箭头，比多箭头再大一个数量级。更高转生解锁。",
  },
  {
    id: "ordinal",
    name: "序数/递归",
    example: "ε0, Γ0",
    unlockAt: "ordinal-0",
    tutorial: "终极转生后进入序数领域。这不是数值，是数学结构的层数。",
  },
];

/** 获取当前数字对应的表示法阶段（从高到低匹配；ordinal 阶段由转生层数控制，此处跳过） */
export function getNotationFor(value: DecimalSource): NotationStage {
  const v = new Decimal(value);
  for (let i = NOTATION_STAGES.length - 1; i >= 0; i--) {
    const stage = NOTATION_STAGES[i];
    if (stage.unlockAt === "0" || stage.unlockAt === "ordinal-0") continue;
    if (v.gte(stage.unlockAt)) return stage;
  }
  return NOTATION_STAGES[0];
}
