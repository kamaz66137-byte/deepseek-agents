---
name: 'create-task-board'
description: '创建看板（Board）并添加任务（Tasks），配置任务依赖关系，启动 BoardRunner 调度多代理协作执行。'
---

# 技能：创建任务看板

## 使用场景

当用户提出目标后，Plan Agent 需要创建看板并将目标拆解为任务列表。也可以手动创建看板用于测试或批处理场景。

---

## 前置知识

- `Tasks` 契约接口位于 `src/contract/tasks.ts`，`BoardRecord` 类型位于 `src/types/task.ts`
- `TaskStatus`：`pending` | `in_progress` | `done` | `blocked` | `cancelled`
- `BoardRunner` 自动调度满足 `dependsOn` 前置条件的任务
- 任务优先级（`priority`）越大越先执行，默认 0

---

## 操作步骤

### 1. 创建看板

```ts
import { randomUUID } from "crypto";
import { createDb } from "./src/db/index.js";

const db = createDb();

const boardId = randomUUID();
db.boards.save({
    id: boardId,
    name: "需求分析与代码实现看板",
    teamId: myTeam.id,                 // 执行团队 ID
    agentId: planAgent.id,             // 创建者（Plan Agent）ID
    objective: "实现用户登录功能，包含 JWT 认证和刷新 token 机制",
});
```

### 2. 创建任务列表（含依赖关系）

```ts
const task1Id = randomUUID();
const task2Id = randomUUID();
const task3Id = randomUUID();
const task4Id = randomUUID();

// 任务 1：需求分析（无前置依赖）
db.tasks.save({
    id: task1Id,
    boardId,
    title: "分析登录功能需求",
    description: "梳理用户登录、JWT 生成、token 刷新的业务需求和技术约束",
    status: "pending",
    assigneeId: planAgent.id,
    teamId: myTeam.id,
    dependsOn: [],                     // 无前置任务
    priority: 10,                      // 高优先级，最先执行
    timeout: 60_000,                   // 60 秒超时
    retryLimit: 1,
});

// 任务 2：实现认证中间件（依赖任务 1）
db.tasks.save({
    id: task2Id,
    boardId,
    title: "实现 JWT 认证中间件",
    description: "基于需求分析结果，实现 verifyToken 中间件，处理 Authorization 请求头",
    status: "pending",
    assigneeId: implementAgent.id,
    teamId: myTeam.id,
    dependsOn: [task1Id],              // 等待任务 1 完成
    priority: 5,
    timeout: 120_000,
});

// 任务 3：实现 token 刷新接口（依赖任务 1）
db.tasks.save({
    id: task3Id,
    boardId,
    title: "实现 /auth/refresh 接口",
    description: "实现 refresh token 校验和新 access token 生成逻辑",
    status: "pending",
    assigneeId: implementAgent.id,
    teamId: myTeam.id,
    dependsOn: [task1Id],              // 与任务 2 可并发执行
    priority: 5,
    timeout: 120_000,
});

// 任务 4：代码审查（依赖任务 2 和 3）
db.tasks.save({
    id: task4Id,
    boardId,
    title: "审查认证模块代码",
    description: "审查中间件和刷新接口的实现，检查安全性、类型安全和错误处理",
    status: "pending",
    assigneeId: reviewAgent.id,
    teamId: myTeam.id,
    dependsOn: [task2Id, task3Id],     // 等待两个实现任务都完成
    priority: 1,
});
```

### 3. 启动 BoardRunner

```ts
import { BoardRunner } from "./src/runtime/index.js";

const boardRunner = new BoardRunner({
    db,
    api: deepseekClient,
    toolRegistry,
    skillRegistry,
    memoryManager,
});

// 启动看板调度（自动并发执行满足依赖条件的任务）
const result = await boardRunner.run(boardId);
console.log("看板执行完成:", result);
```

---

## 任务依赖可视化

```
任务1（需求分析）priority=10
    │
    ├──► 任务2（JWT中间件）priority=5  ─┐
    │                                   ├──► 任务4（代码审查）priority=1
    └──► 任务3（刷新接口）priority=5  ─┘
```

**执行顺序**：任务1 → 任务2 & 任务3（并发）→ 任务4

---

## TaskStatus 状态机

```
pending ──► in_progress ──► done
                │
                └──► blocked（超时或执行失败，可配置重试）
                └──► cancelled（外部取消）
```

---

## 注意事项

- `dependsOn` 中的任务 ID 必须是同一看板下的任务，跨看板依赖不支持
- `priority` 相同时，按创建时间顺序执行
- `timeout` 单位为毫秒，建议根据任务复杂度设置合理超时
- `retryLimit` 设置自动重试次数，`blocked` 状态的任务会自动重试直到达到上限
- `content` 字段用于存储任务执行结果，由 AgentRunner 自动写入，勿手动设置
