/**
 * main.ts
 * 入口文件。阶段 0 仅做渲染自检：验证大数库 + 格式化链路可用。
 * 阶段 1 在此接入游戏循环（点击、生成器、升级、转生）。
 */

import { D } from "./core/bigNum";
import { format } from "./core/format";
import type { DecimalSource } from "break_eternity.js";

const app = document.querySelector<HTMLDivElement>("#app")!;

const samples: Array<[string, DecimalSource]> = [
  ["0", 0],
  ["42", 42],
  ["1234567", "1234567"],
  ["1e100", "1e100"],
  ["1e1e15", "1e1e15"],
  ["10^^4", D(10).tetrate(4)],
  ["1e1e1e15", "1e1e1e15"],
  ["负数", "-1e50"],
];

const list = samples
  .map(([label, v]) => `<li><code>${label}</code> → ${format(D(v))}</li>`)
  .join("");

app.innerHTML = `
  <h1>Big Number Idle</h1>
  <p>阶段 0 骨架自检：大数库 + 格式化链路</p>
  <ul>${list}</ul>
`;
