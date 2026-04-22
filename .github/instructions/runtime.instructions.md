---
name: 'runtime'
description: '运行时层（src/runtime/）编码规范，AgentRunner、BoardRunner、ToolRegistry、SkillRegistry、MemoryManager 实现约束。'
applyTo: 'src/runtime/**/*.ts'
---

# 运行时层编码规范

运行时层负责**根据契约动态组装并执行**代理任务，是框架的核心引擎。

---

## 核心模块职责

| 文件 | 类 | 职责 |
|------|----|------|
| `registry.ts` | `ToolRegistry` | 工具包注册/注销/查找，转换为 OpenAI FunctionTool 格式 |
| `registry.ts` | `SkillRegistry` | 技能包注册/注销/查找 |
| `memory-manager.ts` | `MemoryManager` | 记忆读写查询，构建系统提示词中的 `[MEMORY CONTEXT]` 块 |
| `agent-runner.ts` | `AgentRunner` | 单 Agent ReAct（推理-行动）执行循环，调用 DeepSeek API |
| `board-runner.ts` | `BoardRunner` | 团队看板编排，调度多 Agent 并发/串行执行 |

---

## AgentRunner 编码规则

### ReAct 循环约束

- 工具调用最大循环次数通过 `MAX_TOOL_ITERATIONS` 常量控制（默认 10），防止无限循环
- 每轮循环必须截断消息列表（`#truncateMessages`），保持上下文在 `maxInputChars * 0.8` 以内
- 工具执行失败时，返回 `{ error: "..." }` JSON 字符串，**不抛出异常**，继续对话循环

### 任务状态机

```
pending → in_progress（乐观锁 casStatus）
in_progress → done（正常完成）
in_progress → blocked（超时或异常）
任何状态 → cancelled（外部取消）
```

- 使用 `casStatus(id, FROM, TO)` 乐观锁更新任务状态，若返回 `false` 说明被抢占，直接抛出异常
- 任务超时通过 `Promise.race([executePromise, timeoutPromise])` 实现

### 结果持久化

- 执行完成后：写入 `task.content`，保存到 `agent` 和 `team` 两个 memory scope
- 执行失败后：写入错误信息到 `task.content`，保存错误消息到 `messages` 表

---

## ToolRegistry / SkillRegistry 编码规则

- 私有属性 `#bundles: Map<string, ToolDefinition[]>` 存储所有工具包
- `register` 返回 `this`，支持链式调用
- `toFunctionTools` 必须转换为 OpenAI 兼容的 `FunctionTool` 格式（`type: "function"`）
- `loadFromDb` 中，`execute` 函数无法从 DB 反序列化，必须通过 `execMap` 参数补全

```ts
// ✅ 正确：通过 execMap 补全 execute
registry.loadFromDb(repo, {
    "search_web": async (input) => { /* 实现 */ },
    "read_file": async (input) => { /* 实现 */ },
});
```

---

## MemoryManager 编码规则

- 记忆写入按 `scope` 分层：`"agent"` / `"team"` / `"user"` / `"global"`
- `buildContextBlock(agentId)` 构建 Agent 私有记忆块
- `buildTeamContextBlock(teamId)` 构建团队共享记忆块
- 记忆内容截断至 2000 字符后存储（`content.slice(0, 2000)`）

---

## 依赖注入规则

所有 Runner/Manager 必须通过构造函数接收依赖，**不得**直接 import 或实例化 DB/API 客户端：

```ts
// ✅ 正确：构造函数注入
export class AgentRunner {
    constructor(options: AgentRunnerOptions) {
        this.#db = options.db;
        this.#api = options.api;
    }
}

// ❌ 错误：直接引入单例
import { db } from "../db/client.js";
```

---

## 错误处理规则

- 所有 `async` 方法必须有 `try/catch`，捕获后更新任务状态为 `blocked`
- 工具调用错误返回 `{ error: string, callId: string, toolName: string }` JSON
- DeepSeek API 返回空 choices 时抛出 `Error("DeepSeek API returned empty choices")`
- 不吞噬错误：catch 后必须 `throw err` 重新抛出，或写入 `messages` 表记录

---

## 性能与安全

- 消息截断：系统提示词固定保留，历史消息从最旧开始丢弃
- `maxInputChars` 默认 32,000，可通过构造函数 options 覆盖
- 工具参数通过 `JSON.parse(argsJson)` 解析，必须有 try/catch 包裹
