---
name: 'contract'
description: '契约层（src/contract/）编码规范，契约优先设计原则，接口定义、枚举常量约束。'
applyTo: 'src/contract/**/*.ts'
---

# 契约层编码规范

契约层是整个项目的**单一数据来源（SSOT）**，所有配置、结构定义均在此声明。运行时层、数据库层只能**读取**契约，不能反向修改。

---

## 契约接口规则

### 必须遵守

- 每个契约接口必须包含 `type` 字段，值为对应的 `CONTRACTS` 枚举常量（`typeof CONTRACTS.XXX`）
- 所有字段必须有 `@property` JSDoc 注释，说明类型与语义
- 接口字段优先使用 `readonly`，契约定义后不可变
- 禁止在契约接口中定义方法，契约是纯数据结构
- 禁止使用 `any`，所有字段类型必须显式声明

### 契约接口模板

```ts
import { type CONTRACTS } from "./contract.js";

/**
 * @interface XxxContract
 * @description XXX 契约接口
 * @property {typeof CONTRACTS.XXX} type - 契约类型，固定为 CONTRACTS.XXX
 * @property {string} id - 唯一标识
 * @property {string} name - 契约名称
 * @property {string} description - 契约描述
 * @property {string} content - 契约内容，必须遵守的规则和限制
 */
export interface XxxContract {
    readonly type: typeof CONTRACTS.XXX;
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly content: string;
}
```

---

## 枚举常量规则（`contract/constant/`）

- 枚举常量必须使用 `as const` 对象模式，不使用 TypeScript `enum` 关键字
- 必须同时导出常量对象和类型（`typeof Xxx[keyof typeof Xxx]`）
- 枚举值使用小写字符串（如 `"plan"`、`"agent"`），便于序列化

```ts
/**
 * @const XxxType
 * @description XXX 类型枚举
 * @property {string} AAA - AAA 含义
 * @property {string} BBB - BBB 含义
 */
export const XxxType = {
    AAA: "aaa",
    BBB: "bbb",
} as const;

export type XxxType = (typeof XxxType)[keyof typeof XxxType];
```

---

## 导出规范（`contract/index.ts`）

- 只通过 `index.ts` 导出契约层公开 API
- 使用具名导出，**禁止** `export *`
- 常量用 `export { Xxx }`，类型用 `export type { XxxType }`

```ts
// ✅ 正确
export { CONTRACTS } from "./contract.js";
export type { ContractType, Agents, Teams } from "./xxx.js";

// ❌ 错误
export * from "./agents.js";
```

---

## 常见契约类型速查

| 常量 | 接口 | 文件 |
|------|------|------|
| `CONTRACTS.AGENTS` | `Agents` | `agents.ts` |
| `CONTRACTS.TEAMS` | `Teams` | `teams.ts` |
| `CONTRACTS.ROLES` | `Roles` | `role.ts` |
| `CONTRACTS.TOOLS` | `Tools` | `tools.ts` |
| `CONTRACTS.SKILLS` | `Skills` | `skills.ts` |
| `CONTRACTS.MEMORYS` | `Memorys` | `memorys.ts` |
| `CONTRACTS.TASKS` | `Tasks` | `tasks.ts` |
| `CONTRACTS.DOCS` | `Docs` | `docs.ts` |

---

## 禁止事项

- ❌ 在契约接口中引入运行时依赖（如 DB 客户端、API 客户端）
- ❌ 在契约文件中编写业务逻辑
- ❌ 修改已发布契约的必填字段（保持向后兼容，新增字段用 `?` 可选）
- ❌ 循环引用（契约间单向依赖：`Agents` 可引用 `Teams/Tools/Skills`，但 `Teams` 不能引用 `Agents`）
