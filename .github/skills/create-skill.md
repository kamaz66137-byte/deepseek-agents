---
name: 'create-skill'
description: '创建一个符合 deepseek-agents 规范的 Skill 定义（SkillDefinition），并注册到 SkillRegistry，增强 Agent 的能力。'
---

# 技能：创建 Skill 定义

## 使用场景

当需要为 Agent 封装可复用的提示词模板或结构化处理能力（如思维链、计划分解、代码审查）时，使用此技能创建 `SkillDefinition` 并注册到 `SkillRegistry`。

> **Tool vs Skill 区别**：
> - **Tool**：调用外部系统（搜索、读写文件、API 请求），有具体的 I/O 参数
> - **Skill**：封装 Agent 内部能力增强（提示词模板、推理策略），通常影响系统提示词

---

## 前置知识

- `SkillDefinition` 接口定义位于 `src/types/skill.ts`
- `SkillRegistry` 位于 `src/runtime/registry.ts`
- `SkillsType` 枚举：`think` | `plan` | `execute` | `review` | `memory`
- Skill 的 `content` 字段是注入到系统提示词的提示词片段

---

## 操作步骤

### 1. 确认技能类型

根据 `SkillsType` 选择合适的类别：

| 类型 | 值 | 适用场景 |
|------|----|----------|
| THINK | `"think"` | 链式思维、推理策略 |
| PLAN | `"plan"` | 任务分解、步骤规划 |
| EXECUTE | `"execute"` | 代码生成、内容撰写 |
| REVIEW | `"review"` | 代码审查、质量验证 |
| MEMORY | `"memory"` | 记忆检索、上下文整合 |

### 2. 实现 SkillDefinition

```ts
import { randomUUID } from "crypto";
import type { SkillDefinition } from "./src/types/index.js";

interface ChainOfThoughtInput {
    readonly problem: string;
    readonly steps?: number;
}

interface ChainOfThoughtOutput {
    readonly reasoning: string;
    readonly conclusion: string;
}

const chainOfThoughtSkill: SkillDefinition<ChainOfThoughtInput, ChainOfThoughtOutput> = {
    id: randomUUID(),
    name: "chain_of_thought",             // 技能名称，snake_case，全局唯一
    description: "使用链式思维（CoT）对问题进行逐步推理，提高复杂问题的分析准确性",
    content: `## 链式思维推理规则
当遇到复杂问题时，请按以下步骤推理：
1. **理解问题**：用自己的话重述问题，确认理解正确
2. **拆解步骤**：将问题分解为可独立处理的子问题
3. **逐步推导**：对每个子问题给出分析和结论
4. **综合结论**：整合所有子结论，给出最终答案
5. **验证合理性**：检查结论是否自洽、是否满足原始约束`,

    async execute(input: ChainOfThoughtInput): Promise<ChainOfThoughtOutput> {
        // 技能执行逻辑（可以是纯提示词处理，也可以调用 API）
        // 注意：复杂技能可在此调用 DeepSeek API 进行二次推理
        return {
            reasoning: `分析问题：${input.problem}\n分步推理过程...`,
            conclusion: "综合结论...",
        };
    },
};
```

### 3. 注册到 SkillRegistry

```ts
import { SkillRegistry } from "./src/runtime/registry.js";

const skillRegistry = new SkillRegistry();

// 按包名分组注册（bundleName 对应 Skills 契约的 name 字段）
skillRegistry.register("reasoning-skills", [
    chainOfThoughtSkill,
    // 可添加多个技能到同一个包
]);
```

### 4. 创建对应的 Skills 契约

```ts
import { CONTRACTS, SkillsType } from "./src/contract/index.js";
import type { Skills } from "./src/contract/index.js";

const reasoningSkillsContract: Skills = {
    type: CONTRACTS.SKILLS,
    id: randomUUID(),
    pid: null,                           // 父级技能 ID，顶级技能为 null
    sort: 1,                             // 排序权重
    skilltype: SkillsType.THINK,         // 技能类型
    name: "reasoning-skills",            // 必须与 bundleName 一致
    alias: "推理增强技能集",
    description: "提供链式思维等推理增强能力",
    logo: "",
    tags: "reasoning,cot,think",
    path: "src/skills/reasoning",
    content: "包含 chain_of_thought 技能，适用于复杂问题分析场景",
    create: new Date(),
    update: new Date(),
};
```

---

## 注意事项

- `content` 字段中的提示词片段会被**注入到系统提示词**，注意格式清晰、指令明确
- 同一 Agent 绑定的所有 Skill 的 `content` 会被拼接，避免内容冲突
- 技能的 `execute` 函数失败时应返回带 `error` 字段的对象，不要抛出异常
- `SkillRegistry.loadFromDb` 加载时 `execute` 无法反序列化，需在应用启动时手动重新注册
