---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 172d745a872aa79fdf2e35353139044d_5bcd528db0df11f1ac01525400e6dd8f
    ReservedCode1: 2KBl32/r26DZYTEvNh3WVfG5Jr6fjpkaLGBHkvU0nmVRYP/OStfBXS02trf+57OjUH5H2wA6OuyTQj54a4aQThzb4mJwQZyp2foMCVGNaPuIe3YhM7kTUF0QciEs9ZPn1XR7CnojXxsXnCq+ycINseOtv5Uge/sX9+o1E4oLbC8nTXD6mnisfvEEp0s=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 172d745a872aa79fdf2e35353139044d_5bcd528db0df11f1ac01525400e6dd8f
    ReservedCode2: 2KBl32/r26DZYTEvNh3WVfG5Jr6fjpkaLGBHkvU0nmVRYP/OStfBXS02trf+57OjUH5H2wA6OuyTQj54a4aQThzb4mJwQZyp2foMCVGNaPuIe3YhM7kTUF0QciEs9ZPn1XR7CnojXxsXnCq+ycINseOtv5Uge/sX9+o1E4oLbC8nTXD6mnisfvEEp0s=
---

# Big Number Idle

把"大数表示法"本身做成玩法的增量游戏：数字的"写法"会随成长进化，表示法升级本身就是核心爽点。

路线：普通数 → 科学计数法 → 指数塔 → 超运算 → 多箭头 → 链式箭头 → 序数/递归。

## 特性（v1.0.0）

- **表示法进化**：7 阶段表示法自动解锁，每次解锁弹出教程弹窗
- **点击 + 生成器 + 升级**：经典 idle 循环，升级提升增长阶数
- **转生系统**：数字达 1e100 转生获得层级点，购买永久加成（+10%/级）
- **序数转生**：累计产出达 1e1e308 进入序数领域，×10^100/级海量加成
- **成就系统**：12 个成就覆盖点击/生成器/转生/表示法路线，跨轮保留
- **表现层**：Web Audio 合成音效（可静音）、点击飘字、脉冲/闪光动画
- **存档**：localStorage 自动保存，离线收益结算，版本迁移（当前 v4）
- **移动端适配**：小屏按钮全宽、触控优化、iOS 安全区避让

## 技术栈

| 项 | 选择 | 说明 |
|---|---|---|
| 构建 | Vite + TypeScript | 原生 DOM，无框架 |
| 大数库 | break_eternity.js 2.1.3 | 支持到 10^^1e308 |
| 测试 | Vitest | 88 用例覆盖核心逻辑 |
| 部署 | GitHub Pages + Actions | 推送 main 自动构建发布 |

## 目录结构

```
src/
├── core/
│   ├── bigNum.ts      # 大数封装（统一构造/比较/序列化 + 层级系统接口）
│   ├── format.ts      # 格式化：普通数/科学计数法/指数塔嵌套 + 边界处理
│   └── sound.ts       # Web Audio 音效合成与静音持久化
├── game/
│   ├── notations.ts   # 表示法阶段表（7 阶段解锁路线）
│   ├── generators.ts  # 生成器与软上限
│   ├── upgrades.ts    # 升级定义
│   ├── rebirth.ts     # 转生与序数转生（序数等级/名称/加成）
│   ├── achievements.ts# 成就定义与检查
│   ├── save.ts        # 存档序列化/迁移（v4）
│   └── uiHelper.ts    # DOM 工具
├── ui.ts              # 界面渲染（数字/面板/成就/音效按钮）
├── main.ts            # 入口：游戏循环、事件、动画反馈
└── style.css          # 样式（含移动端适配）
tests/                 # 8 个测试文件，88 用例
```

## 常用命令

```bash
npm run dev        # 开发服务器
npm test           # 运行测试（Vitest）
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览构建产物
```

## 部署

推送 `main` 分支即触发 `.github/workflows/deploy.yml`，自动构建并发布到 GitHub Pages：

https://lilia-shound.github.io/-big-number-idle/

## 阶段进度

- [x] 阶段 0：项目骨架（Vite + TS + break_eternity.js + Vitest + 格式化 + 阶段表）
- [x] 阶段 1：最小可行原型（点击、生成器、升级、转生、存档、离线收益）
- [x] 阶段 2：表示法解锁与教程
- [x] 阶段 3：转生与永久升级（序数转生）
- [x] 阶段 4：内容与表现（成就、音效、动画、存档 v4）
- [x] 阶段 5：打磨与发布（移动端适配、文档、v1.0.0）

## 关键设计决策

1. **所有数值一律走 `D()` 构造 / `Num` 类型**，禁止在游戏逻辑中用原生 number 做大数运算。
2. **序列化用字符串**（`serialize`/`deserialize`），不直接 JSON 化 Decimal 对象，为存档版本迁移留口。
3. **软上限 + 层级点封顶**：`applySoftCap` 压缩 1e95~1e105 区间的原值；幂型生成器单次幂可冲出软上限，故转生点 `MAX_POINTS_PER_REBIRTH=2` 封顶防爆炸。
4. **成就显示判定走 `unlockedNotations`**：序数转生清空升级列表，表示法解锁状态须从跨轮保留的标记读取。
5. break_eternity 2.x 注意点：
   - ESM 引入为 `import Decimal from "break_eternity.js"`（默认导出，不是具名导出）
   - NaN 判断是 `isNan()`（N 大写），不是 `isNaN()`
   - 类型用 `DecimalSource`（不是 `Decimal.Value`）
   - pow 等运算存在浮点尾差（如 2^10 = 1024.0000000000002），测试断言需容差比较
*（内容由AI生成，仅供参考）*
