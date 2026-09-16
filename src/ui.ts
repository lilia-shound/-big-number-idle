/**
 * ui.ts
 * DOM 渲染：根据 GameState 更新全部界面元素。
 * 纯展示逻辑，不包含任何游戏规则。
 *
 * 阶段 2：新增表示法面板（当前表示法 / 下一目标）与解锁教程弹窗。
 * 阶段 3：序数转生面板（序数等级 / 当前序数 / 门槛）与序数加成展示。
 */

import { format, formatInt } from "./core/format";
import { D } from "./core/bigNum";
import type Decimal from "break_eternity.js";
import type { GameState } from "./game/save";
import { GENERATOR_DEFS, generatorCost } from "./game/generators";
import { UPGRADE_DEFS } from "./game/upgrades";
import {
  canRebirth,
  canOrdinalRebirth,
  ordinalName,
  ORDINAL_THRESHOLD,
  PERMANENT_UPGRADE_COST,
} from "./game/rebirth";
import { makeTickContext, perSecondTmp, calcClickPower } from "./game/uiHelper";
import {
  NOTATION_STAGES,
  getTopUnlockedNotation,
  unlockThreshold,
  type NotationStage,
} from "./game/notations";

export interface UiState {
  /** 离线收益提示文本（显示一段时间后自动清空） */
  offlineNote: string;
  /** 离线提示过期时间戳（ms），超过后自动隐藏并清空 */
  offlineNoteExpire: number;
  /** 待展示的表示法教程队列 */
  tutorialQueue: NotationStage[];
}

function $id(id: string): HTMLElement {
  return document.getElementById(id)!;
}

export function initUi(): UiState {
  const ui: UiState = { offlineNote: "", offlineNoteExpire: 0, tutorialQueue: [] };
  // 教程弹窗关闭：关闭当前，弹下一个待展示
  $id("btn-tutorial-close").addEventListener("click", () => {
    $id("tutorial-modal").classList.add("hidden");
    if (ui.tutorialQueue.length > 0) {
      showTutorialModal(ui.tutorialQueue.shift()!);
    }
  });
  return ui;
}

function showTutorialModal(stage: NotationStage): void {
  $id("tutorial-title").textContent = `解锁表示法：${stage.name}`;
  $id("tutorial-example").textContent = stage.example;
  $id("tutorial-text").textContent = stage.tutorial;
  $id("tutorial-modal").classList.remove("hidden");
}

/** 入队并弹出表示法教程（未弹出时立即弹第一个） */
export function showTutorial(ui: UiState, stage: NotationStage): void {
  ui.tutorialQueue.push(stage);
  if ($id("tutorial-modal").classList.contains("hidden")) {
    showTutorialModal(ui.tutorialQueue.shift()!);
  }
}

/** 渲染表示法面板：最高已解锁表示法（路线进度）+ 下一目标 */
function renderNotation(state: GameState): void {
  const current = getTopUnlockedNotation(state.unlockedNotations);
  $id("notation-name").textContent = current.id === "ordinal"
    ? `序数 / 递归 · ${ordinalName(state.ordinalLevel)}`
    : current.name;
  $id("notation-example").textContent = current.id === "ordinal"
    ? ordinalName(state.ordinalLevel)
    : current.example;

  const have = new Set(state.unlockedNotations);
  const next = NOTATION_STAGES.find((st) => !have.has(st.id));
  const nextEl = $id("notation-next");
  if (!next) {
    nextEl.textContent = "表示法已全部解锁！";
    return;
  }
  const th = unlockThreshold(next);
  if (th === null) {
    // ordinal：由序数转生解锁
    nextEl.textContent = `下一表示法：${next.name}（累计产出达 1e1e308 后序数转生）`;
    return;
  }
  nextEl.textContent = `下一表示法：${next.name}（需要累计产出达到 ${next.unlockAt}）`;
}

/** 渲染序数转生面板 */
function renderOrdinal(state: GameState, useSci: boolean): void {
  $id("ordinal-level").textContent = String(state.ordinalLevel);
  $id("ordinal-name").textContent = ordinalName(state.ordinalLevel);
  $id("ordinal-mult").textContent =
    state.ordinalLevel > 0 ? `×10^${state.ordinalLevel * 100}` : "×1";

  const btn = $id("btn-ordinal") as HTMLButtonElement;
  const ready = canOrdinalRebirth(state.totalEarned);
  btn.disabled = !ready;
  $id("ordinal-req").textContent = ready
    ? "可以进行序数转生！"
    : `距序数转生还差累计产出 ${format(ORDINAL_THRESHOLD.sub(state.totalEarned).max(D(0)), 2, useSci)}`;
}

export function updateUi(state: GameState, ui: UiState): void {
  const $ = (id: string): HTMLElement => document.getElementById(id)!;
  const ctx = makeTickContext(state);
  // 已解锁"科学计数法"表示法即用 1.23e45 形式（表示法跨轮保留，序数转生不清除）
  const useSci = state.unlockedNotations.includes("scientific");
  const fmt = (x: Decimal): string => format(x, 2, useSci);

  // 主数字
  $("num").textContent = fmt(state.number);
  const perSec = perSecondTmp(state.number, ctx);
  $("per-second").textContent = `每秒 ${fmt(perSec)}`;
  $("btn-click").textContent = `+${fmt(calcClickPower(state))}`;

  // 离线提示：显示 15 秒后自动清空
  const note = $("offline-note");
  if (ui.offlineNote && Date.now() < ui.offlineNoteExpire) {
    note.textContent = ui.offlineNote;
    note.classList.remove("hidden");
  } else {
    if (ui.offlineNote) ui.offlineNote = "";
    note.classList.add("hidden");
  }

  // 表示法面板
  renderNotation(state);

  // 生成器
  const genBox = $("generators");
  genBox.innerHTML = "";
  for (const def of GENERATOR_DEFS) {
    const owned = state.counts[def.id] ?? 0;
    const cost = generatorCost(def, owned);
    const affordable = state.number.gte(cost);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-info">
        <div class="card-title">${def.name}</div>
        <div class="card-desc">${def.desc}</div>
        <div class="card-count">已购 ${owned}</div>
      </div>
      <div class="card-buy">
        <span class="price">${fmt(cost)}</span>
        <button class="btn buy-btn" data-buy="gen:${def.id}" ${affordable ? "" : "disabled"}>购买</button>
      </div>`;
    genBox.appendChild(card);
  }

  // 升级
  const upBox = $("upgrades");
  upBox.innerHTML = "";
  for (const def of UPGRADE_DEFS) {
    const bought = state.upgrades.includes(def.id);
    const affordable = state.number.gte(def.cost);
    const card = document.createElement("div");
    card.className = "card";
    if (bought) {
      card.innerHTML = `
        <div class="card-info">
          <div class="card-title">${def.name}</div>
          <div class="card-desc">${def.desc}</div>
          <div class="card-count bought">已购买</div>
        </div>`;
    } else {
      card.innerHTML = `
        <div class="card-info">
          <div class="card-title">${def.name}</div>
          <div class="card-desc">${def.desc}</div>
        </div>
        <div class="card-buy">
          <span class="price">${fmt(def.cost)}</span>
          <button class="btn buy-btn" data-buy="up:${def.id}" ${affordable ? "" : "disabled"}>购买</button>
        </div>`;
    }
    upBox.appendChild(card);
  }

  // 序数转生
  renderOrdinal(state, useSci);

  // 转生
  $("layer-points").textContent = formatInt(state.layerPoints);
  $("rebirth-count").textContent = String(state.rebirths);
  $("permanent-mult").textContent = `×${(1.1 ** state.permanentLevel).toFixed(2)}`;

  const rebirthBtn = $("btn-rebirth") as HTMLButtonElement;
  const rebirthable = canRebirth(state.number);
  rebirthBtn.disabled = !rebirthable;
  $("rebirth-req").textContent = rebirthable
    ? "可以转生了！"
    : `距转生还差 ${fmt(D(1e100).sub(state.number))}`;

  const permCost = PERMANENT_UPGRADE_COST(state.permanentLevel);
  const permBtn = $("btn-permanent") as HTMLButtonElement;
  permBtn.disabled = !state.layerPoints.gte(permCost);
  permBtn.textContent = `购买永久 +10%（${formatInt(permCost)} 层级点）`;
}
