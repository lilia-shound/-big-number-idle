/**
 * game/upgrades.ts
 * 10 个升级：提高产出 / 提高指数 / 解锁科学计数法 / 离线收益等。
 */

import Decimal from "break_eternity.js";
import { D } from "../core/bigNum";

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: Decimal;
}

export const UPGRADE_DEFS: UpgradeDef[] = [
  { id: "clickx2", name: "点击强化 I", desc: "点击产出 ×2", cost: D(500) },
  { id: "clickx5", name: "点击强化 II", desc: "点击产出 ×5", cost: D(5e4) },
  { id: "gen1x2", name: "生成器+1 强化 I", desc: "自动 +1 产出 ×2", cost: D(5e3) },
  { id: "gen1x10", name: "生成器+1 强化 II", desc: "自动 +1 产出 ×10", cost: D(5e5) },
  { id: "gen2x15", name: "生成器×2 强化 I", desc: "自动 ×2 升级为 ×3", cost: D(1e6) },
  { id: "gen2x2", name: "生成器×2 强化 II", desc: "自动 ×3 升级为 ×4", cost: D(1e8) },
  { id: "gen3x12", name: "生成器^1.1 强化 I", desc: "自动 ^1.1 升级为 ^1.2", cost: D(1e9) },
  { id: "gen3x15", name: "生成器^1.1 强化 II", desc: "自动 ^1.2 升级为 ^1.5", cost: D(1e11) },
  { id: "offlinex2", name: "离线收益 I", desc: "离线收益上限从 2x 提升到 4x", cost: D(1e6) },
];
