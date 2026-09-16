/**
 * game/achievements.ts
 * 阶段 4：成就系统。里程碑式成就，覆盖点击 / 生成器 / 转生 / 表示法路线。
 * 纯逻辑、可单测；解锁后跨轮保留（不随转生重置）。
 */

import Decimal from "break_eternity.js";
import { D } from "../core/bigNum";

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** 未解锁时面板显示的达成提示 */
  hint: string;
  /** 图标字符（几何符号，非 emoji，避免字体兼容问题） */
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-click", name: "初来乍到", desc: "第一次点击主按钮", hint: "点击主按钮", icon: "◆" },
  { id: "click-100", name: "点指如飞", desc: "累计点击 100 次", hint: "累计点击 100 次", icon: "◆" },
  { id: "first-gen", name: "自动化第一步", desc: "购买第一个生成器", hint: "购买任意生成器", icon: "▲" },
  { id: "gen-10", name: "十条产线", desc: "任一生成器拥有 10 个", hint: "任意生成器 ×10", icon: "▲" },
  { id: "reach-1e6", name: "科学计数", desc: "数字达到 1e6", hint: "数字达到 1e6", icon: "★" },
  { id: "reach-1e100", name: "百次方", desc: "数字达到 1e100", hint: "数字达到 1e100", icon: "★" },
  { id: "first-rebirth", name: "第一次转生", desc: "完成 1 次转生", hint: "完成 1 次转生", icon: "★" },
  { id: "rebirth-10", name: "轮回常客", desc: "完成 10 次转生", hint: "完成 10 次转生", icon: "★" },
  { id: "reach-tower", name: "指数塔", desc: "数字达到 1e1e3", hint: "数字达到 1e1e3", icon: "▲" },
  { id: "reach-chain", name: "链式之巅", desc: "数字达到 1e1e308", hint: "数字达到 1e1e308", icon: "▲" },
  { id: "first-ordinal", name: "序数觉醒", desc: "进入序数领域", hint: "完成 1 次序数转生", icon: "★" },
  { id: "ordinal-5", name: "高阶序数", desc: "序数等级达到 5", hint: "序数等级达到 5", icon: "★" },
];

/** 成就检查所需的最小状态（与 GameState 解耦，便于测试） */
export interface AchievementState {
  clicks: number;
  counts: Record<string, number>;
  number: Decimal;
  rebirths: number;
  ordinalLevel: number;
}

/** 按 id 取成就定义 */
export function getAchievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * 检查新达成的成就（相对 prev 已解锁集合）。
 * @param prev 已解锁 id 集合
 * @param s 当前游戏状态快照
 * @returns 本次新解锁的成就定义（按列表顺序）
 */
export function checkAchievements(prev: Set<string>, s: AchievementState): AchievementDef[] {
  const num = s.number;
  const anyGen = Object.values(s.counts).some((n) => n > 0);
  const maxGen = Object.values(s.counts).reduce((a, b) => Math.max(a, b), 0);

  const conditions: Record<string, boolean> = {
    "first-click": s.clicks >= 1,
    "click-100": s.clicks >= 100,
    "first-gen": anyGen,
    "gen-10": maxGen >= 10,
    "reach-1e6": num.gte(D(1e6)),
    "reach-1e100": num.gte(D("1e100")),
    "first-rebirth": s.rebirths >= 1,
    "rebirth-10": s.rebirths >= 10,
    "reach-tower": num.gte(D("1e1e3")),
    "reach-chain": num.gte(D("1e1e308")),
    "first-ordinal": s.ordinalLevel >= 1,
    "ordinal-5": s.ordinalLevel >= 5,
  };

  const out: AchievementDef[] = [];
  for (const def of ACHIEVEMENTS) {
    if (!prev.has(def.id) && conditions[def.id]) out.push(def);
  }
  return out;
}
