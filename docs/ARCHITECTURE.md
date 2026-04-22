# deepseek-agents 架构上下文文档

> 版本：0.1.0 | 作者：zkali | 更新：2026-04-22

---

## 一、项目定位

`deepseek-agents` 是一个 **契约优先（Contract-First）** 的多代理运行时框架，以 TypeScript 编写，面向生产环境。  
核心思想：

- **契约（Contract）** 是一切配置的单一来源（Single Source of Truth）。代理、团队、角色、工具、技能、记忆、任务都以契约形式静态声明。  
- **运行时（Runtime）** 根据契约动态组装系统提示词、注册工具/技能、调度任务，真正调用 DeepSeek API 并协调多代理协作。  
- **SQLite** 作为本地持久化后端，存储所有运行时状态（看板、任务、记忆、对话历史）。

---

## 二、目录结构

```
src/
├── config/                  # 环境与 API 配置
│   ├── env.ts               # DeepSeekEnv：从环境变量读取 apiKey / baseUrl / model
│   └── api.ts               # DeepSeekConfig：完整配置（继承 env + contracts + temperature 等）
│
├── contract/                # 静态契约接口（契约层）
│   ├── contract.ts          # CONTRACTS 枚举常量（契约类型名称）
│   ├── agents.ts            # Agents 契约接口（代理蓝图）
│   ├── teams.ts             # Teams 契约接口（团队蓝图）
│   ├── role.ts              # Roles 契约接口（角色/人设蓝图）
│   ├── docs.ts              # Docs 契约接口（知识库蓝图）
│   ├── tools.ts             # Tools 契约接口（工具集蓝图）
│   ├── skills.ts            # Skills 契约接口（技能蓝图）
│   ├── memorys.ts           # Memorys 契约接口（记忆蓝图）
│   ├── tasks.ts             # Tasks 契约接口（任务蓝图）
│   ├── index.ts             # 契约层统一导出
│   └── constant/            # 枚举常量
│       ├── contract.ts      # CONTRACTS 枚举（与 contract.ts 保持一致）
│       ├── teams-role.ts    # TeamRole：plan / implement / acceptance / review
│       ├── role.ts          # Role：User / System
│       ├── memory-type.ts   # MemoryType：agent / team / user / global
│       ├── skills-types.ts  # SkillsType：think / plan / execute / review / memory
│       ├── tools-types.ts   # ToolsType：search / read / write / execute / network
│       └── index.ts         # constant 统一导出
│
├── types/                   # 运行时类型定义（运行时层）
│   ├── agent.ts             # AgentConfig / AgentMessage / AgentRunInput / AgentRunResult / TeamConfig / AgentMode
│   ├── contract.ts          # ContractEntity / ContractRef / QueryContractInput / ContractListResult
│   ├── docs.ts              # DocRecord / CreateDocInput / UpdateDocInput
│   ├── role.ts              # RoleRecord / CreateRoleInput / UpdateRoleInput
│   ├── team.ts              # TeamRecord / CreateTeamInput / UpdateTeamInput
│   ├── task.ts              # Task / BoardRecord / TaskStatus / CreateTaskInput / UpdateTaskInput / CreateBoardInput
│   ├── skill.ts             # SkillDefinition / SkillResult
│   ├── tool.ts              # ToolDefinition / ToolCall / ToolParameter / ToolResult
│   ├── memory.ts            # MemoryEntry / MemoryScope / SaveMemoryInput / QueryMemoryInput / DeleteMemoryInput / MemoryQueryResult
│   └── index.ts             # 运行时类型统一导出
│
├── db/                      # SQLite 持久化层（待实现）
│   ├── schema.ts            # 建表 DDL
│   ├── client.ts            # better-sqlite3 连接单例
│   └── repositories/        # 各实体 CRUD
│       ├── agent.ts
│       ├── team.ts
│       ├── board.ts
│       ├── task.ts
│       └── memory.ts
│
├── api/                     # DeepSeek HTTP 客户端（待实现）
│   └── deepseek.ts          # chatCompletion()、支持 tool_calls 响应
│
└── runtime/                 # 代理运行时引擎（待实现）
    ├── registry.ts          # ToolRegistry / SkillRegistry
    ├── memory-manager.ts    # MemoryManager（read/write/query）
    ├── agent-runner.ts      # AgentRunner：单个 Agent 执行循环
    ├── board-runner.ts      # BoardRunner：团队看板编排器
    └── index.ts             # 运行时统一导出
```

---

## 三、核心实体关系

```
┌─────────────────────────────────────────────────────────────┐
│                          Teams                              │
│  id / name / description / logo / content / tags           │
│  agents: string[]  ← Agent ID 列表                         │
└────────────────────────┬────────────────────────────────────┘
                         │ 1 : N
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                         Agents                              │
│  id / name / alias / description / prompt                  │
│  deepseekModel / temperature                               │
│  role: TeamRoleType  ← plan | implement | acceptance | review│
│  teams: Teams        ← 归属团队                             │
│  tools: Tools        ← 工具集契约                           │
│  skills: Skills      ← 技能契约                             │
│  memory: Memorys     ← 记忆契约                             │
│  docs: Docs          ← 知识库契约                           │
└──┬──────┬──────┬──────┬──────────────────────────────────────┘
   │      │      │      │
   ▼      ▼      ▼      ▼
 Roles  Tools  Skills  Memorys / Docs
```

### 团队角色（TeamRole）语义

| 角色 | 值 | 职责 |
|------|-----|------|
| PLAN | `"plan"` | 接收用户目标，拆解为任务，**创建看板**，将任务分配给 implement 代理 |
| IMPLEMENT | `"implement"` | 接收任务，调用 DeepSeek API 执行，更新任务状态，写入结果 |
| REVIEW | `"review"` | 审核 implement 产出，判断任务是否符合要求，可要求重做 |
| ACCEPTANCE | `"acceptance"` | 最终验收，确认所有任务完成，输出最终结果 |

---

## 四、看板（Board）与任务（Task）机制

```
用户输入目标
    │
    ▼
Plan Agent（role=plan）
    │  调用 DeepSeek API 分析目标
    │  生成任务列表
    ▼
创建 Board（boardId 唯一）
    │
    ├─ Task1（assigneeId=agentA, status=pending, dependsOn=[]）
    ├─ Task2（assigneeId=agentB, status=pending, dependsOn=[task1.id]）
    └─ Task3（assigneeId=agentA, status=pending, dependsOn=[task1.id, task2.id]）

BoardRunner 调度循环：
    1. 获取所有 pending 任务
    2. 过滤出 dependsOn 全部 done 的任务（可并发执行）
    3. 为每个任务启动 AgentRunner
    4. AgentRunner 执行完毕后更新 task.status = done | blocked
    5. Review Agent 审核（如配置）
    6. 重复直到所有任务 done 或出现 blocked/cancelled
    7. Acceptance Agent 最终验收
```

---

## 五、Agent 执行循环（ReAct 模式）

```
AgentRunner.run(task):
    1. 从 DB 加载 AgentConfig（systemPrompt + tools + skills）
    2. 构建初始消息：[system(prompt), user(task.description)]
    3. 调用 DeepSeek API（chatCompletion）
    4. 解析响应：
       ├─ 普通文本回复 → 记录结果，退出循环
       └─ tool_calls → 执行工具，将结果附加到消息列表，回到步骤3
    5. 将最终 content 写回 task.content
    6. 更新 task.status = done
    7. 保存本次对话到 memory（scope=agent）
```

---

## 六、记忆（Memory）分层

| 作用域 | 值 | 可见性 | 典型用途 |
|--------|-----|--------|---------|
| AGENT | `"agent"` | 仅当前 Agent | 代理私有推理过程、中间结果 |
| TEAM | `"team"` | 同团队所有 Agent | 团队共享上下文、任务输出 |
| USER | `"user"` | 属于某用户 | 用户偏好、历史交互 |
| GLOBAL | `"global"` | 全局 | 系统级知识、全局配置 |

---

## 七、SQLite 数据库表结构

```sql
-- 团队
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo TEXT,
  content TEXT,
  tags TEXT,           -- JSON array string
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 代理
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  name TEXT NOT NULL,
  alias TEXT NOT NULL,
  description TEXT,
  role TEXT NOT NULL,  -- plan | implement | acceptance | review
  deepseek_model TEXT NOT NULL,
  temperature REAL,
  prompt TEXT NOT NULL,
  contract_json TEXT NOT NULL,  -- 完整契约 JSON 快照
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 看板
CREATE TABLE boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team_id TEXT REFERENCES teams(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),  -- 创建者（plan agent）
  objective TEXT,     -- 用户原始目标
  created_at TEXT NOT NULL
);

-- 任务
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|in_progress|done|blocked|cancelled
  assignee_id TEXT REFERENCES agents(id),
  team_id TEXT REFERENCES teams(id),
  depends_on TEXT,    -- JSON array string
  content TEXT,       -- 执行结果
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 记忆
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,     -- agent | team | user | global
  owner_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  tags TEXT,               -- JSON array string
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(scope, owner_id, key)
);

-- 消息历史（Agent 对话记录）
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  task_id TEXT REFERENCES tasks(id),
  role TEXT NOT NULL,      -- system | user | assistant | tool
  content TEXT NOT NULL,
  tool_call_id TEXT,
  name TEXT,
  created_at TEXT NOT NULL
);
```

---

## 八、DeepSeek API 调用规范

- **接口**：`POST {baseUrl}/chat/completions`
- **认证**：`Authorization: Bearer {apiKey}`
- **模型**：`deepseek-chat`（普通对话）或 `deepseek-reasoner`（开启推理链）
- **Tool Call 格式**：兼容 OpenAI function calling 规范（`tools` 字段 + `tool_choice`）
- **推理模式**：当 `model=deepseek-reasoner` 时，响应包含 `reasoning_content` 字段

```typescript
// 请求体结构
{
  model: "deepseek-chat" | "deepseek-reasoner",
  messages: ChatMessage[],
  temperature?: number,
  max_tokens?: number,
  tools?: ToolSchema[],       // function calling 定义
  tool_choice?: "auto" | "none"
}

// 响应结构
{
  id: string,
  choices: [{
    message: {
      role: "assistant",
      content: string | null,
      reasoning_content?: string,  // deepseek-reasoner 专属
      tool_calls?: [{
        id: string,
        type: "function",
        function: { name: string, arguments: string }
      }]
    },
    finish_reason: "stop" | "tool_calls" | "length"
  }]
}
```

---

## 九、模块依赖关系

```
config ──────────────────────────────────────────────┐
   │                                                  │
contract ─────────────────────────────────────────── │
   │                                                  │
types ────────────────────────────────────────────── │
   │                                                  ▼
db/schema ──► db/client ──► db/repositories     api/deepseek
                                  │                   │
                                  ▼                   ▼
                        runtime/registry ◄─── runtime/agent-runner
                        runtime/memory-manager ◄──── │
                                  │                   │
                                  ▼                   │
                        runtime/board-runner ◄────────┘
```

---

## 十、生产就绪要求

1. **类型安全**：所有模块严格 TypeScript，无 `any` 泄漏
2. **错误处理**：API 超时、工具执行失败均有明确错误类型和回退策略
3. **幂等性**：看板/任务创建使用调用方提供的 `id`，支持重试
4. **并发安全**：SQLite WAL 模式，任务状态更新使用乐观锁（CAS）
5. **可观测性**：每个关键步骤记录结构化日志（到 `messages` 表 + console）
6. **内存限制**：`maxInputChars` 限制上下文窗口，超出时截断历史消息
7. **依赖注入**：所有 runner 通过构造函数接收 DB、API 客户端，便于测试替换
