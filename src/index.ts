/**
 * @packageDocumentation
 * @module deepseek-agents
 * @since 1.0.0
 * @author zkali
 * @tags [index, export]
 * @description deepseek-agents 主包统一导出入口
 * @path src/index.ts
 */

// 配置层
export { loadDeepSeekEnv } from "./config/env.js";
export type { DeepSeekEnv } from "./config/env.js";
export type { DeepSeekConfig, Contract } from "./config/api.js";

// 契约层
export { CONTRACTS, TeamRole, Role, MemoryType, SkillsType, ToolsType } from "./contract/constant/index.js";
export type {
    ContractType,
    Agents,
    Teams,
    Roles,
    Docs,
    Tools,
    Skills,
    Memorys,
    Tasks,
} from "./contract/index.js";
export type { TeamRoleType, RoleType, MemoryTypeValue, SkillsTypeValue, ToolsTypeValue } from "./contract/constant/index.js";

// 运行时类型层
export { AgentMode, TaskStatus, MemoryScope } from "./types/index.js";
export type {
    AgentConfig,
    AgentMessage,
    AgentRunInput,
    AgentRunResult,
    TeamConfig,
    ContractEntity,
    ContractListResult,
    ContractRef,
    QueryContractInput,
    CreateDocInput,
    DocRecord,
    UpdateDocInput,
    CreateRoleInput,
    RoleRecord,
    UpdateRoleInput,
    CreateTeamInput,
    TeamRecord,
    UpdateTeamInput,
    CreateBoardInput,
    CreateTaskInput,
    BoardRecord,
    Task,
    UpdateTaskInput,
    SkillDefinition,
    SkillResult,
    ToolCall,
    ToolDefinition,
    ToolParameter,
    ToolResult,
    DeleteMemoryInput,
    MemoryEntry,
    MemoryQueryResult,
    QueryMemoryInput,
    SaveMemoryInput,
} from "./types/index.js";

// 数据库层
export { createDb } from "./db/index.js";
export type {
    Db,
    AgentRecord,
    ToolBundleRepository,
    SkillBundleRepository,
    ToolBundleRecord,
    SkillBundleRecord,
    PersistedToolDefinition,
    PersistedSkillDefinition,
} from "./db/index.js";

// API 客户端
export { createDeepSeekClient, DeepSeekApiError } from "./api/deepseek.js";
export type {
    ChatMessage,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionStreamChunk,
    StreamDelta,
    FunctionTool,
    ToolCallResponse,
    DeepSeekClient,
} from "./api/deepseek.js";

// 运行时引擎
export { ToolRegistry, SkillRegistry, MemoryManager, AgentRunner, BoardRunner } from "./runtime/index.js";
export type { MemoryManagerOptions, AgentRunnerOptions, BoardRunnerOptions, BoardRunResult } from "./runtime/index.js";

// 事件总线
export { createEventBus } from "./events/index.js";
export type {
    EventBus,
    AgentEvent,
    AgentEventType,
    TaskStartedEvent,
    TaskDoneEvent,
    TaskBlockedEvent,
    TaskRetryEvent,
    BoardStartedEvent,
    BoardCompletedEvent,
} from "./events/index.js";

// HTTP API 服务器
export { createApiServer } from "./api/server.js";
export type { ApiServer, ApiServerOptions } from "./api/server.js";
