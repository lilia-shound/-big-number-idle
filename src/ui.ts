/**
 * ui.ts
 * DOM 渲染：根据 GameState 更新全部界面元素。
 * 纯展示逻辑，不包含任何游戏规则。
 */

import { format, formatInt } from "./core/format";
import { D } from "./core/bigNum";
import type { GameState } from "./game/save";
import { GENERATOR_DEFS, generatorCost } from "./game/generators";
import { UPGRADE_DEFS } from "./game/upgrades";
import { canRebirth, PERMANENT_UPGRADE_COST } from "./game/rebirth";
import { makeTickContext, perSecondTmp } from "./game/uiHelper";

export interface UiState {
  /** 离线收益提示文本（一次结算后清空） */
  offlineNote: string;
}

export function initUi(): UiState {
  return { offlineNote: "" };
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
