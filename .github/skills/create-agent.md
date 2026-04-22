---
name: 'create-agent'
description: '创建一个符合 deepseek-agents 契约规范的 Agent 契约对象，包含模型配置、角色、工具、技能、记忆、知识库绑定。'
---

# 技能：创建 Agent 契约

## 使用场景

当需要向项目中新增一个 AI 代理时，使用此技能生成符合 `Agents` 契约接口的完整配置对象。

---

## 前置知识

- `Agents` 接口定义位于 `src/contract/agents.ts`
- `TeamRole` 枚举：`plan` | `implement` | `review` | `acceptance`
- DeepSeek 模型：`deepseek-chat`（普通对话）| `deepseek-reasoner`（推理链）
- Agent 必须绑定一个 `Teams` 契约、一个 `Tools` 契约、一个 `Skills` 契约

---

## 操作步骤

### 1. 确认 Agent 基本信息

在创建前，确认以下信息：
- **名称（name）**：系统内部唯一标识符
- **别名（alias）**：UI 展示名称，同团队内唯一
- **角色（role）**：`plan` / `implement` / `review` / `acceptance`
- **绑定团队（teams）**：已存在的 Teams 契约对象
- **使用模型（deepseekModel）**：`deepseek-chat` 或 `deepseek-reasoner`

### 2. 生成 Agent 契约对象

```ts
import { CONTRACTS, TeamRole } from "./src/contract/index.js";
import type { Agents, Teams, Tools, Skills, Memorys, Docs } from "./src/contract/index.js";

const myAgent: Agents = {
    type: CONTRACTS.AGENTS,
    id: crypto.randomUUID(),
    name: "agent-implement-01",           // 系统唯一标识
    alias: "实现代理-01",                  // UI 展示名
    description: "负责执行代码实现任务",
    deepseekModel: "deepseek-chat",
    temperature: 0.7,                      // 可选，范围 0-2
    role: TeamRole.IMPLEMENT,
    teams: myTeam,                         // 已存在的 Teams 契约
    tools: myTools,                        // 已存在的 Tools 契约
    skills: mySkills,                      // 已存在的 Skills 契约
    memory: myMemory,                      // 已存在的 Memorys 契约
    docs: myDocs,                          // 已存在的 Docs 契约
    prompt: `你是一个专业的 TypeScript 开发工程师。
你的职责是根据任务描述编写高质量的 TypeScript 代码。
- 严格遵循项目现有的代码风格和接口定义
- 输出完整可运行的代码，包含必要的类型注释
- 遇到不确定的需求时，先完成可实现的部分，再说明假设前提`,
};
```

### 3. 持久化到数据库

```ts
import { createDb } from "./src/db/index.js";

const db = createDb();
db.agents.save({
    id: myAgent.id,
    teamId: myAgent.teams.id,
    name: myAgent.name,
    alias: myAgent.alias,
    description: myAgent.description,
    role: myAgent.role,
    deepseekModel: myAgent.deepseekModel,
    temperature: myAgent.temperature,
    prompt: myAgent.prompt,
    contractJson: JSON.stringify(myAgent),
});
```

---

## 注意事项

- `prompt` 字段是 Agent 的系统提示词核心，务必清晰描述职责边界
- `temperature` 推荐值：推理/分析任务用 `0.3`，创意/写作任务用 `0.8`，代码生成用 `0.6`
- `deepseek-reasoner` 模型会在响应中包含 `reasoning_content`，适合 `plan` 和 `review` 角色
- 同一团队内 `alias` 必须唯一，`name` 全局唯一
