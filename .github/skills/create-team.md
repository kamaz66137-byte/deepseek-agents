---
name: 'create-team'
description: '创建一个符合 deepseek-agents 契约规范的 Team 契约，包含团队成员列表和团队配置。'
---

# 技能：创建 Team 契约

## 使用场景

当需要组建一个多代理协作团队时，使用此技能创建 `Teams` 契约，将多个 Agent 组织到同一团队，实现 Plan → Implement → Review → Acceptance 的完整工作流。

---

## 前置知识

- `Teams` 接口定义位于 `src/contract/teams.ts`
- 团队包含 4 种角色的 Agent：`plan`、`implement`、`review`、`acceptance`
- `BoardRunner` 使用团队配置来调度任务
- 团队记忆（`scope="team"`）对所有团队成员可见

---

## 操作步骤

### 1. 规划团队角色分工

在创建团队前，明确各角色职责：

| 角色 | 推荐模型 | 职责说明 |
|------|----------|----------|
| `plan` | `deepseek-reasoner` | 理解用户目标，拆解为可执行任务列表，创建看板 |
| `implement` | `deepseek-chat` | 接收具体任务，调用工具执行，输出结果 |
| `review` | `deepseek-reasoner` | 检查 implement 输出质量，决定通过或要求重做 |
| `acceptance` | `deepseek-chat` | 汇总所有任务结果，输出最终交付物 |

> 最小团队：至少需要 1 个 `plan` Agent 和 1 个 `implement` Agent

### 2. 创建 Teams 契约对象

```ts
import { randomUUID } from "crypto";
import type { Teams } from "./src/contract/index.js";

// 假设 Agent ID 已提前生成
const planAgentId = randomUUID();
const implementAgentId = randomUUID();
const reviewAgentId = randomUUID();
const acceptanceAgentId = randomUUID();

const myTeam: Teams = {
    id: randomUUID(),
    name: "fullstack-dev-team",          // 系统唯一标识，kebab-case
    description: "全栈开发团队，负责 TypeScript 项目的需求分析、代码实现、代码审查和交付",
    logo: "",                            // 团队图标 URL 或文件路径，可为空
    tags: ["typescript", "fullstack", "development"],
    agents: [
        planAgentId,
        implementAgentId,
        reviewAgentId,
        acceptanceAgentId,
    ],
    content: `## 团队工作规范
- 所有代码必须符合 TypeScript 严格模式，无 any 泄漏
- 代码提交前必须通过类型检查（tsc --noEmit）
- Review 阶段重点检查：类型安全、错误处理、边界条件
- Acceptance 阶段输出完整的交付报告`,
};
```

### 3. 持久化团队到数据库

```ts
import { createDb } from "./src/db/index.js";

const db = createDb();
db.teams.save({
    id: myTeam.id,
    name: myTeam.name,
    description: myTeam.description,
    logo: myTeam.logo,
    content: myTeam.content,
    tags: myTeam.tags,
});
```

### 4. 创建 TeamConfig（运行时配置）

```ts
import type { TeamConfig } from "./src/types/index.js";

const teamConfig: TeamConfig = {
    teamId: myTeam.id,
    planAgentId,
    implementAgentIds: [implementAgentId],  // 支持多个 implement Agent 并发执行
    reviewAgentId,                           // 可选
    acceptanceAgentId,                       // 可选
};
```

---

## 完整团队创建示例

```ts
// 1. 创建团队
const team: Teams = { id: randomUUID(), name: "my-team", /* ... */ };

// 2. 创建各角色 Agent（引用团队）
const planAgent: Agents = {
    type: CONTRACTS.AGENTS,
    id: randomUUID(),
    role: TeamRole.PLAN,
    teams: team,
    deepseekModel: "deepseek-reasoner",
    prompt: "你是团队计划者，负责将用户目标拆解为具体可执行的任务...",
    // ...
};

const implementAgent: Agents = {
    type: CONTRACTS.AGENTS,
    id: randomUUID(),
    role: TeamRole.IMPLEMENT,
    teams: team,
    deepseekModel: "deepseek-chat",
    prompt: "你是团队实现者，负责根据任务描述完成具体的代码实现...",
    // ...
};

// 3. 更新团队 agents 列表
team.agents = [planAgent.id, implementAgent.id];
```

---

## 注意事项

- 团队 `name` 全局唯一，建议使用 `kebab-case` 格式
- `agents` 数组存储的是 Agent ID 字符串，不是 Agent 对象（避免循环引用）
- 团队 `content` 字段会作为团队共享上下文注入到所有成员的系统提示词
- 一个 Agent 只能属于一个团队（通过 `Agents.teams` 字段绑定）
