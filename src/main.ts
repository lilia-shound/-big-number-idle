/**
 * main.ts
 * 入口：加载存档 → 离线收益结算 → 游戏循环 → 事件绑定 → 自动保存。
 * 阶段 1：点击 + 3 生成器 + 10 升级 + 转生 + 层级点永久加成。
 *
 * 节奏设计：游戏规则按"每秒"结算（tick），UI 每 100ms 刷新。
 */

import "./style.css";
import { D, ZERO } from "./core/bigNum";
import { format } from "./core/format";
import { tick, generatorCost, GENERATOR_DEFS } from "./game/generators";
import { UPGRADE_DEFS } from "./game/upgrades";
import {
  initialState,
  loadFromStorage,
  saveToStorage,
  computeOffline,
  makeTickContext,
} from "./game/save";
import { doRebirth, PERMANENT_UPGRADE_COST } from "./game/rebirth";
import { updateUi, initUi, type UiState } from "./ui";

const UI_MS = 100;
const TICK_MS = 1000;
const SAVE_INTERVAL_MS = 30_000;

let state = loadFromStorage() ?? initialState();
const ui: UiState = initUi();

/** 离线收益结算（仅启动时一次） */
function applyOffline(): void {
  const now = Date.now();
  const { gain, seconds, mult } = computeOffline(state, now);
  if (gain.gt(ZERO)) {
    state.number = state.number.add(gain);
    state.totalEarned = state.totalEarned.add(gain);
    state.lastSaved = now;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    ui.offlineNote = `离线 ${h > 0 ? `${h}小时` : ""}${m}分钟，获得 ${format(gain)}（×${mult}）`;
  }
}

/** 点击 +1（受升级与永久加成影响） */
function onClick(): void {
  const ctx = makeTickContext(state);
  let power = D(1);
  if (state.upgrades.includes("clickx2")) power = power.mul(2);
  if (state.upgrades.includes("clickx5")) power = power.mul(5);
  power = power.mul(ctx.permanentMult);
  state.clickPower = power;
  state.number = state.number.add(power);
  state.totalEarned = state.totalEarned.add(power);
}

/** 购买生成器 / 升级 */
function onBuy(kind: string, id: string): void {
  if (kind === "gen") {
    const def = GENERATOR_DEFS.find((g) => g.id === id);
    if (!def) return;
    const owned = state.counts[id] ?? 0;
    const cost = generatorCost(def, owned);
    if (state.number.gte(cost)) {
      state.number = state.number.sub(cost);
      state.counts[id] = owned + 1;
    }
  } else if (kind === "up") {
    const def = UPGRADE_DEFS.find((u) => u.id === id);
    if (!def) return;
    if (state.upgrades.includes(id)) return;
    if (state.number.gte(def.cost)) {
      state.number = state.number.sub(def.cost);
      state.upgrades.push(id);
    }
  }
}

/** 转生：结算层级点，重置产出类资源 */
function onRebirth(): void {
  const r = doRebirth(state.totalEarned, state.layerPoints, state.permanentLevel);
  state.layerPoints = r.newPoints;
  state.number = D(0);
  state.totalEarned = D(0);
  state.counts = { gen1: 0, gen2: 0, gen3: 0 };
  state.upgrades = [];
  state.rebirths += 1;
  ui.offlineNote = `转生成功！获得 ${r.gained.toString()} 层级点（当前永久加成 ×${(1.1 ** state.permanentLevel).toFixed(2)}）`;
}

/** 购买永久加成（+10% 产出 / 级） */
function onBuyPermanent(): void {
  const cost = PERMANENT_UPGRADE_COST(state.permanentLevel);
  if (state.layerPoints.gte(cost)) {
    state.layerPoints = state.layerPoints.sub(cost);
    state.permanentLevel += 1;
  }
}

/** 每秒游戏逻辑 */
function tickGame(): void {
  const before = state.number;
  const ctx = makeTickContext(state);
  state.number = tick(state.number, ctx);
  const gained = state.number.sub(before);
  if (gained.gt(ZERO)) {
    state.totalEarned = state.totalEarned.add(gained);
  }
}

// ---------- 启动 ----------
applyOffline();
updateUi(state, ui);

// 事件绑定（事件委托）
document.getElementById("btn-click")!.addEventListener("click", onClick);
document.getElementById("btn-rebirth")!.addEventListener("click", onRebirth);
document.getElementById("btn-permanent")!.addEventListener("click", onBuyPermanent);
document.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest("[data-buy]") as HTMLElement | null;
  if (!target) return;
  const [kind, id] = (target.dataset.buy ?? ":").split(":");
  onBuy(kind, id);
});

// 游戏循环：每秒结算，100ms 刷新 UI
setInterval(tickGame, TICK_MS);
setInterval(() => updateUi(state, ui), UI_MS);

// 自动保存
setInterval(() => saveToStorage(state), SAVE_INTERVAL_MS);
window.addEventListener("beforeunload", () => saveToStorage(state));
