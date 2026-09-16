/**
 * ui.ts
 * DOM 渲染：根据 GameState 更新全部界面元素。
 * 纯展示逻辑，不包含任何游戏规则。
 *
 * 阶段 2：新增表示法面板（当前表示法 / 下一目标）与解锁教程弹窗。
 */

import { format, formatInt } from "./core/format";
import { D } from "./core/bigNum";
import type { GameState } from "./game/save";
import { GENERATOR_DEFS, generatorCost } from "./game/generators";
import { UPGRADE_DEFS } from "./game/upgrades";
import { canRebirth, PERMANENT_UPGRADE_COST } from "./game/rebirth";
import { makeTickContext, perSecondTmp } from "./game/uiHelper";
import {
  NOTATION_STAGES,
  getNotationFor,
  unlockThreshold,
  type NotationStage,
} from "./game/notations";

export interface UiState {
  /** 离线收益提示文本（一次结算后清空） */
  offlineNote: string;
  /** 待展示的表示法教程队列 */
  tutorialQueue: NotationStage[];
}

function $id(id: string): HTMLElement {
  return document.getElementById(id)!;
}

export function initUi(): UiState {
  const ui: UiState = { offlineNote: "", tutorialQueue: [] };
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

/** 渲染表示法面板：当前表示法 + 下一目标 */
function renderNotation(state: GameState): void {
  const current = getNotationFor(state.totalEarned);
  $id("notation-name").textContent = current.name;
  $id("notation-example").textContent = current.example;

  const have = new Set(state.unlockedNotations);
  // 找第一个未解锁的常规表示法（跳过 ordinal：阶段 3）
  const next = NOTATION_STAGES.find((s) => !have.has(s.id) && s.id !== "ordinal");
  const nextEl = $id("notation-next");
  if (!next) {
    nextEl.textContent = "表示法已全部解锁！";
    return;
  }
  const th = unlockThreshold(next);
  nextEl.textContent = th
    ? `下一表示法：${next.name}（需要累计产出达到 ${next.unlockAt}）`
    : `下一表示法：${next.name}（${next.unlockAt}）`;
}

export function updateUi(state: GameState, ui: UiState): void {
  const $ = (id: string): HTMLElement => document.getElementById(id)!;
  const ctx = makeTickContext(state);

  // 主数字
  $("num").textContent = format(state.number);
  const perSec = perSecondTmp(state.number, ctx);
  $("per-second").textContent = `每秒 ${format(perSec)}`;
  $("btn-click").textContent = `+${format(state.clickPower)}`;

  // 离线提示
  const note = $("offline-note");
  if (ui.offlineNote) {
    note.textContent = ui.offlineNote;
    note.classList.remove("hidden");
  } else {
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
        <span class="price">${format(cost)}</span>
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
          <span class="price">${format(def.cost)}</span>
          <button class="btn buy-btn" data-buy="up:${def.id}" ${affordable ? "" : "disabled"}>购买</button>
        </div>`;
    }
    upBox.appendChild(card);
  }

  // 转生
  $("layer-points").textContent = formatInt(state.layerPoints);
  $("rebirth-count").textContent = String(state.rebirths);
  $("permanent-mult").textContent = `×${(1.1 ** state.permanentLevel).toFixed(2)}`;

  const rebirthBtn = $("btn-rebirth") as HTMLButtonElement;
  const rebirthable = canRebirth(state.number);
  rebirthBtn.disabled = !rebirthable;
  $("rebirth-req").textContent = rebirthable
    ? "可以转生了！"
    : `距转生还差 ${format(D(1e100).sub(state.number))}`;

  const permCost = PERMANENT_UPGRADE_COST(state.permanentLevel);
  const permBtn = $("btn-permanent") as HTMLButtonElement;
  permBtn.disabled = !state.layerPoints.gte(permCost);
  permBtn.textContent = `购买永久 +10%（${formatInt(permCost)} 层级点）`;
}
