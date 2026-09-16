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

把"大数表示法"本身做成玩法的增量游戏。

路线：普通数 → 科学计数法 → 指数塔 → 超运算 → 多箭头 → 链式箭头 → 序数/递归。

## 技术栈（阶段 0 已落地）

| 项 | 选择 | 说明 |
|---|---|---|
| 构建 | Vite 8 + TypeScript 7 | 原生 DOM，无框架 |
| 大数库 | break_eternity.js 2.1.3 | 支持到 10^^1e308 |
| 测试 | Vitest | 大数封装 + 格式化边界 |

## 目录结构

```
src/
├── core/
│   ├── bigNum.ts    # 大数封装（统一构造/比较/序列化 + 层级系统接口）
│   └── format.ts    # 格式化：普通数/科学计数法/指数塔嵌套 + 边界处理
├── game/
│   └── notations.ts # 表示法阶段表（7 阶段解锁路线）
└── main.ts          # 入口（阶段 0 为渲染自检）
tests/               # 冒烟测试
```

## 常用命令

```bash
npm run dev        # 开发服务器
npm test           # 运行测试
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览构建产物
```

## 阶段进度

- [x] 阶段 0：项目骨架（Vite + TS + break_eternity.js + Vitest + 格式化 + 阶段表）
- [ ] 阶段 1：最小可行原型（点击、生成器、升级、转生、存档）
- [ ] 阶段 2：表示法解锁与教程
- [ ] 阶段 3：转生与永久升级
- [ ] 阶段 4：内容与表现
- [ ] 阶段 5：打磨与发布

## 关键设计决策

1. **所有数值一律走 `D()` 构造 / `Num` 类型**，禁止在游戏逻辑中用原生 number 做大数运算。
2. **序列化用字符串**（`serialize`/`deserialize`），不直接 JSON 化 Decimal 对象，为存档版本迁移留口。
3. **`LayerInfo` 分层接口**已预留：数值突破 10^^1e308 后在其上叠加指数塔层数/箭头数。
4. **格式化边界全覆盖**：0、1、负数、NaN、Infinity、指数塔嵌套（10^^4 → 1e1e1e10）。
5. break_eternity 2.x 注意点：
   - ESM 引入为 `import Decimal from "break_eternity.js"`（默认导出，不是具名导出）
   - NaN 判断是 `isNan()`（N 大写），不是 `isNaN()`
   - 类型用 `DecimalSource`（不是 `Decimal.Value`）
   - pow 等运算存在浮点尾差（如 2^10 = 1024.0000000000002），测试断言需容差比较
*（内容由AI生成，仅供参考）*
