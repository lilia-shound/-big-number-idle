/**
 * main.ts
 * 入口：加载存档 → 离线收益结算 → 游戏循环 → 事件绑定 → 自动保存。
 * 阶段 1：点击 + 3 生成器 + 10 升级 + 转生 + 层级点永久加成。
 * 阶段 2：表示法解锁系统（累计产出跨过门槛自动解锁并弹教程）。
 * 阶段 3：序数转生（终极转生）→ 序数领域，解锁序数表示法与海量加成。
 * 阶段 4：成就系统（里程碑式解锁 + toast 提示）、音效（Web Audio 合成）、
 *         动画反馈（点击飘字 / 数字脉冲 / 转生闪光 / 购买轻跳）。
 *
 * 节奏设计：游戏规则按"每秒"结算（tick），UI 每 100ms 刷新。
 */

import "./style.css";
import { D, ZERO } from "./core/bigNum";
import { format } from "./core/format";
import { tick, generatorCost, GENERATOR_DEFS, applySoftCap } from "./game/generators";
import { UPGRADE_DEFS } from "./game/upgrades";
import {
  initialState,
  loadFromStorage,
  saveToStorage,
  computeOffline,
  makeTickContext,
} from "./game/save";
import {
  doRebirth,
  canOrdinalRebirth,
  ordinalName,
  PERMANENT_UPGRADE_COST,
} from "./game/rebirth";
import { updateUi, initUi, showTutorial, type UiState } from "./ui";
import { calcClickPower } from "./game/uiHelper";
import { checkUnlocks } from "./game/notations";
import { checkAchievements, type AchievementDef } from "./game/achievements";
import { sfx, setSoundMuted, isSoundMuted } from "./core/sound";

const UI_MS = 100;
const TICK_MS = 1000;
const SAVE_INTERVAL_MS = 30_000;
/** 离线/转生提示展示时长（ms），到期自动清空 */
const OFFLINE_NOTE_MS = 15_000;

let state = loadFromStorage() ?? initialState();
const ui: UiState = initUi();

/**
 * 表示法解锁检查：用累计产出（totalEarned）判断，跨轮保留。
 * 新解锁的表示法写入存档并弹教程。
 */
function syncUnlocks(): void {
  const fresh = checkUnlocks(state.unlockedNotations, state.totalEarned, state.ordinalLevel);
  for (const stage of fresh) {
    state.unlockedNotations.push(stage.id);
    sfx.unlock();
    showTutorial(ui, stage);
  }
}

/** 成就检查：新达成的成就写入存档，播放音效并弹 toast */
function syncAchievements(): void {
  const fresh = checkAchievements(new Set(state.achievements), {
    clicks: state.clicks,
    counts: state.counts,
    number: state.number,
    rebirths: state.rebirths,
    ordinalLevel: state.ordinalLevel,
  });
  for (const def of fresh) {
    state.achievements.push(def.id);
    sfx.achievement();
    showAchievementToast(def);
  }
}

let toastTimer = 0;

/** 成就解锁 toast：克隆节点重启动画，3.2s 后自动隐藏 */
function showAchievementToast(def: AchievementDef): void {
  const old = document.getElementById("achievement-toast");
  if (!old) return;
  const clone = old.cloneNode(true) as HTMLElement;
  clone.id = "achievement-toast";
  old.parentNode!.replaceChild(clone, old);
  const title = clone.querySelector("#toast-title");
  const desc = clone.querySelector("#toast-desc");
  if (title) title.textContent = `成就解锁：${def.name}`;
  if (desc) desc.textContent = def.desc;
  clone.classList.remove("hidden");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => clone.classList.add("hidden"), 3200);
}

/** 点击飘字：在数字面板上方生成 +X 并上浮淡出 */
function spawnFloat(text: string): void {
  const panel = document.getElementById("number-panel");
  if (!panel) return;
  const el = document.createElement("div");
  el.className = "float-text";
  el.textContent = `+${text}`;
  panel.appendChild(el);
  window.setTimeout(() => el.remove(), 900);
}

/** 触发主数字脉冲动画 */
function pulseNumber(): void {
  const num = document.getElementById("num");
  if (!num) return;
  num.classList.remove("pulse");
  void num.offsetWidth;
  num.classList.add("pulse");
}

/** 触发全屏闪光（转生 / 序数转生） */
function flashApp(): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.classList.remove("flash");
  void app.offsetWidth;
  app.classList.add("flash");
}

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
    ui.offlineNote = `离线 ${h > 0 ? `${h}小时` : ""}${m}分钟，获得 ${format(gain, 2, state.unlockedNotations.includes("scientific"))}（×${mult}）`;
    ui.offlineNoteExpire = Date.now() + OFFLINE_NOTE_MS;
  }
}

/** 点击 +1（受升级与永久加成影响，与 UI 显示一致）；含音效、飘字、脉冲与成就统计 */
function onClick(): void {
  const power = calcClickPower(state);
  state.clickPower = power;
  state.number = state.number.add(power);
  state.totalEarned = state.totalEarned.add(power);
  state.clicks += 1;
  sfx.click();
  spawnFloat(format(power, 2, state.unlockedNotations.includes("scientific")));
  pulseNumber();
  syncUnlocks();
  syncAchievements();
}

/** 购买生成器 / 升级；成功购买播放音效与卡片轻跳 */
function onBuy(kind: string, id: string): void {
  let bought = false;
  if (kind === "gen") {
    const def = GENERATOR_DEFS.find((g) => g.id === id);
    if (!def) return;
    const owned = state.counts[id] ?? 0;
    const cost = generatorCost(def, owned);
    if (state.number.gte(cost)) {
      state.number = state.number.sub(cost);
      state.counts[id] = owned + 1;
      bought = true;
    }
  } else if (kind === "up") {
    const def = UPGRADE_DEFS.find((u) => u.id === id);
    if (!def) return;
    if (state.upgrades.includes(id)) return;
    if (state.number.gte(def.cost)) {
      state.number = state.number.sub(def.cost);
      state.upgrades.push(id);
      bought = true;
    }
  }
  if (bought) {
    sfx.buy();
    const card = document.querySelector(`[data-buy="${kind}:${id}"]`)?.closest(".card");
    if (card) {
      card.classList.remove("buy-flash");
      void (card as HTMLElement).offsetWidth;
      card.classList.add("buy-flash");
    }
    syncAchievements();
  }
}

/** 转生：结算层级点，重置产出类资源（已解锁表示法保留） */
function onRebirth(): void {
  const r = doRebirth(state.totalEarned, state.layerPoints, state.permanentLevel);
  state.layerPoints = r.newPoints;
  state.number = D(0);
  state.totalEarned = D(0);
  state.counts = { gen1: 0, gen2: 0, gen3: 0 };
  state.upgrades = [];
  state.rebirths += 1;
  sfx.rebirth();
  flashApp();
  ui.offlineNote = `转生成功！获得 ${r.gained.toString()} 层级点（当前永久加成 ×${(1.1 ** state.permanentLevel).toFixed(2)}）`;
  ui.offlineNoteExpire = Date.now() + OFFLINE_NOTE_MS;
  syncAchievements();
}

/** 购买永久加成（+10% 产出 / 级） */
function onBuyPermanent(): void {
  const cost = PERMANENT_UPGRADE_COST(state.permanentLevel);
  if (state.layerPoints.gte(cost)) {
    state.layerPoints = state.layerPoints.sub(cost);
    state.permanentLevel += 1;
  }
}

/** 序数转生（终极转生）：重置全部产出资源，序数等级 +1，保留已解锁表示法 */
function onOrdinalRebirth(): void {
  if (!canOrdinalRebirth(state.totalEarned)) return;
  state.ordinalLevel += 1;
  state.number = D(0);
  state.totalEarned = D(0);
  state.counts = { gen1: 0, gen2: 0, gen3: 0 };
  state.upgrades = [];
  state.layerPoints = ZERO;
  state.permanentLevel = 0;
  ui.offlineNote = `进入序数领域 ${ordinalName(state.ordinalLevel)}！产出 ×10^${state.ordinalLevel * 100}`;
  ui.offlineNoteExpire = Date.now() + OFFLINE_NOTE_MS;
  sfx.ordinal();
  flashApp();
  syncUnlocks();
  syncAchievements();
}

/** 每秒游戏逻辑（含转生门槛软上限：数字在 1e95~1e105 间压缩，防层级点爆炸；过 1e105 解除压缩冲刺更高表示法） */
function tickGame(): void {
  const before = state.number;
  const ctx = makeTickContext(state);
  const capped = applySoftCap(tick(state.number, ctx));
  const gained = capped.sub(before);
  state.number = capped;
  if (gained.gt(ZERO)) {
    state.totalEarned = state.totalEarned.add(gained);
  }
  syncUnlocks();
  syncAchievements();
}

// ---------- 启动 ----------
applyOffline();
syncUnlocks();
syncAchievements();
updateUi(state, ui);

// 事件绑定（事件委托）
document.getElementById("btn-click")!.addEventListener("click", onClick);
document.getElementById("btn-rebirth")!.addEventListener("click", onRebirth);
document.getElementById("btn-permanent")!.addEventListener("click", onBuyPermanent);
document.getElementById("btn-ordinal")!.addEventListener("click", onOrdinalRebirth);
document.getElementById("btn-sound")!.addEventListener("click", () => {
  setSoundMuted(!isSoundMuted());
  updateUi(state, ui);
});
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
