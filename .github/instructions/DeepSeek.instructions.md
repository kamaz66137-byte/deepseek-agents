---
name: 'deepseek'
description: 'DeepSeek Agents项目工程结构,契约优先,搭建高质量Agents工程'
applyTo: '**'
---
# DeepSeek Agents项目工程结构说明

`deepseek-agents` 是一个**契约优先（Contract-First）**的多代理运行时框架，以 TypeScript 编写，面向生产环境。

---

## 核心设计原则

- **契约（Contract）是单一数据来源（SSOT）**：代理、团队、角色、工具、技能、记忆、任务均以契约形式静态声明，运行时不得绕过契约直接操作。
- **运行时根据契约动态组装**：系统提示词、工具注册、任务调度均由运行时读取契约后自动完成。
- **SQLite 作为本地持久化后端**：所有运行时状态（看板、任务、记忆、对话历史）持久化到 SQLite。
- **严格 TypeScript**：全项目禁止 `any` 泄漏，所有 I/O 类型必须显式声明。

---

## 目录结构与模块职责

```
src/
├── config/          # 环境变量与 API 配置（DeepSeekEnv、DeepSeekConfig）
├── contract/        # 静态契约接口（契约层 —— 唯一来源）
│   ├── constant/    # 枚举常量（TeamRole、MemoryType、SkillsType 等）
│   └── index.ts     # 契约层统一导出（仅导出公开 API）
├── types/           # 运行时类型定义（DB 记录、输入/输出结构）
├── db/              # SQLite 持久化层（schema + client + repositories）
├── api/             # DeepSeek HTTP 客户端（chatCompletion、tool_calls）
├── events/          # 事件总线
└── runtime/         # 代理运行时引擎
    ├── registry.ts        # ToolRegistry / SkillRegistry
    ├── memory-manager.ts  # MemoryManager（read/write/query）
    ├── agent-runner.ts    # AgentRunner：单 Agent ReAct 执行循环
    ├── board-runner.ts    # BoardRunner：团队看板编排器
    └── index.ts           # 运行时统一导出
```

---

## 核心契约类型

| 契约 | 文件 | 说明 |
|------|------|------|
| `CONTRACTS` | `contract/contract.ts` | 所有契约类型名称枚举 |
| `Agents` | `contract/agents.ts` | 代理蓝图（model、role、tools、skills、memory、docs） |
| `Teams` | `contract/teams.ts` | 团队蓝图（agents 列表） |
| `Roles` | `contract/role.ts` | 角色/人设蓝图 |
| `Tools` | `contract/tools.ts` | 工具集蓝图 |
| `Skills` | `contract/skills.ts` | 技能蓝图 |
| `Memorys` | `contract/memorys.ts` | 记忆蓝图（scope、key、content） |
| `Tasks` | `contract/tasks.ts` | 任务蓝图（status、dependsOn、priority） |
| `Docs` | `contract/docs.ts` | 知识库蓝图 |

---

## 团队角色（TeamRole）语义

| 角色 | 值 | 职责 |
|------|----|------|
| `PLAN` | `"plan"` | 拆解目标为任务，创建看板，分配任务给 implement 代理 |
| `IMPLEMENT` | `"implement"` | 接收任务，调用 DeepSeek API 执行，写入结果 |
| `REVIEW` | `"review"` | 审核 implement 产出，判断是否符合要求 |
| `ACCEPTANCE` | `"acceptance"` | 最终验收，确认所有任务完成，输出结果 |

---

## Agent 执行循环（ReAct 模式）

1. 从 DB 加载 AgentConfig（prompt + tools + skills）
2. 构建初始消息：`[system(prompt + memory), user(task)]`
3. 调用 DeepSeek API（chatCompletion）
4. 解析响应：普通文本 → 记录结果退出；`tool_calls` → 执行工具，追加结果，回到步骤 3
5. 写回 `task.content`，更新 `task.status = done`
6. 保存对话到 memory（scope=agent/team）

---

## 编码规范摘要

- 所有 `.ts` 文件必须有文件头部 `@packageDocumentation` 注释（见 `comment.instructions.md`）
- `index.ts` 只导出公开 API，禁止 `export *`
- 契约接口禁止在运行时直接 `new`，通过工厂函数或 DB 加载
- 错误处理：API 超时、工具执行失败均需明确 catch 并标记 `task.status = blocked`
- 并发安全：任务状态更新使用乐观锁（`casStatus`）
  