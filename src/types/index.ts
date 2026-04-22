/**
 * @packageDocumentation
 * @module runtime-types-index
 * @author zkali
 * @tags ai, runtime, types, export
 * @description 运行时类型统一导出入口
 * @path src/types/index.ts
 */

export type {
    AgentConfig,
    AgentMessage,
    AgentRunInput,
    AgentRunResult,
    TeamConfig,
} from "./agent.js";

export { AgentMode } from "./agent.js";

export type {
    ContractEntity,
    ContractListResult,
    ContractRef,
    QueryContractInput,
} from "./contract.js";

export type {
    CreateDocInput,
    DocRecord,
    UpdateDocInput,
} from "./docs.js";

export type {
    CreateRoleInput,
    RoleRecord,
    UpdateRoleInput,
} from "./role.js";

export type {
    CreateTeamInput,
    TeamRecord,
    UpdateTeamInput,
} from "./team.js";

export type {
    CreateBoardInput,
    CreateTaskInput,
    BoardRecord,
    Task,
    UpdateTaskInput,
} from "./task.js";

export { TaskStatus } from "./task.js";

export type {
    SkillDefinition,
    SkillResult,
} from "./skill.js";

export type {
    ToolCall,
    ToolDefinition,
    ToolParameter,
    ToolResult,
} from "./tool.js";

export type {
    DeleteMemoryInput,
    MemoryEntry,
    MemoryQueryResult,
    QueryMemoryInput,
    SaveMemoryInput,
} from "./memory.js";

export { MemoryScope } from "./memory.js";