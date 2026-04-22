---
name: 'create-tool'
description: '创建一个符合 deepseek-agents 规范的 Tool 定义（ToolDefinition），并注册到 ToolRegistry，使 Agent 可以调用。'
---

# 技能：创建 Tool 定义

## 使用场景

当需要为 Agent 添加新的工具能力（如搜索、读写文件、调用外部 API）时，使用此技能创建符合 `ToolDefinition` 接口的工具，并注册到 `ToolRegistry`。

---

## 前置知识

- `ToolDefinition` 接口定义位于 `src/types/tool.ts`
- `ToolRegistry` 位于 `src/runtime/registry.ts`
- 工具参数遵循 OpenAI function calling JSON Schema 规范
- `ToolsType` 枚举：`search` | `read` | `write` | `execute` | `network`

---

## 操作步骤

### 1. 定义工具输入/输出类型

```ts
// ✅ 为工具入参和出参定义明确类型
interface SearchWebInput {
    readonly query: string;
    readonly maxResults?: number;
}

interface SearchWebOutput {
    readonly results: Array<{ title: string; url: string; snippet: string }>;
    readonly totalCount: number;
}
```

### 2. 实现 ToolDefinition

```ts
import { randomUUID } from "crypto";
import type { ToolDefinition } from "./src/types/index.js";

const searchWebTool: ToolDefinition<SearchWebInput, SearchWebOutput> = {
    id: randomUUID(),
    name: "search_web",                    // 工具名称，全局唯一，snake_case
    description: "在互联网上搜索信息，返回最相关的搜索结果列表",
    parameters: {
        query: {
            id: "query",
            type: "string",
            description: "搜索关键词或问题",
        },
        maxResults: {
            id: "maxResults",
            type: "number",
            description: "最多返回的结果数量，默认 5",
        },
    },
    required: ["query"],                   // 必填参数列表
    async execute(input: SearchWebInput): Promise<SearchWebOutput> {
        // 实现搜索逻辑
        const results = await callSearchApi(input.query, input.maxResults ?? 5);
        return {
            results: results.map(r => ({
                title: r.title,
                url: r.url,
                snippet: r.snippet,
            })),
            totalCount: results.length,
        };
    },
};
```

### 3. 注册到 ToolRegistry

```ts
import { ToolRegistry } from "./src/runtime/registry.js";

const toolRegistry = new ToolRegistry();

// 按包名分组注册（bundleName 对应 Tools 契约的 name 字段）
toolRegistry.register("search-tools", [
    searchWebTool,
    // 可添加多个工具到同一个包
]);

// 链式注册多个包
toolRegistry
    .register("search-tools", [searchWebTool])
    .register("file-tools", [readFileTool, writeFileTool]);
```

### 4. 创建对应的 Tools 契约

```ts
import { CONTRACTS } from "./src/contract/index.js";
import type { Tools } from "./src/contract/index.js";

const searchToolsContract: Tools = {
    type: CONTRACTS.TOOLS,
    id: randomUUID(),
    name: "search-tools",               // 必须与 bundleName 一致
    alias: "搜索工具集",
    description: "提供互联网搜索能力的工具集合",
    content: "包含 search_web 工具，支持关键词搜索和结构化结果返回",
};
```

---

## 参数类型规范

| JSON Schema 类型 | TypeScript 类型 | 说明 |
|-----------------|-----------------|------|
| `"string"` | `string` | 文本参数 |
| `"number"` | `number` | 数值参数 |
| `"boolean"` | `boolean` | 布尔参数 |
| `"array"` | `unknown[]` | 数组参数（需在 description 说明元素类型） |
| `"object"` | `Record<string, unknown>` | 对象参数 |

---

## 注意事项

- 工具 `name` 必须全局唯一，使用 `snake_case` 命名（DeepSeek API 要求）
- `execute` 函数内部的错误**不要抛出**，返回 `{ error: string }` 对象，由 AgentRunner 处理
- 工具执行超时建议在 `execute` 内部自行控制（如 axios timeout）
- `description` 务必清晰准确，Agent 依赖此描述判断何时调用该工具
