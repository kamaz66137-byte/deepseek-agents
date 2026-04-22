/**
 * @packageDocumentation
 * @module deepseek-ai-contract-index-1.0.0
 * @author zkali
 * @tags ai, contract, export
 * @description AI 契约模块统一入口 —— 显式导出契约常量与接口类型
 * @path src/ai/contract/index.ts
 */

import { CONTRACTS } from "./contract.js";
import type { ContractType } from "./contract.js";
import type { Roles } from "./role.js";
import type { Docs } from "./docs.js";
import type { Tools } from "./tools.js";
import type { Agents } from "./agents.js";
import type { Teams } from "./teams.js";
import type { Skills } from "./skills.js";
import type { Memorys } from "./memorys.js";
import type { Tasks } from "./tasks.js";

export { CONTRACTS };
export type { ContractType, Roles, Docs, Tools, Agents, Teams, Skills, Memorys, Tasks };

// 常量枚举 re-exports（从 constant 子模块统一提升）
export { TeamRole } from "./constant/index.js";
export type { TeamRoleType } from "./constant/index.js";
export { Role } from "./constant/index.js";
export type { RoleType } from "./constant/index.js";
export { MemoryType } from "./constant/index.js";
export type { MemoryTypeValue } from "./constant/index.js";
export { SkillsType } from "./constant/index.js";
export type { SkillsTypeValue } from "./constant/index.js";
export { ToolsType } from "./constant/index.js";
export type { ToolsTypeValue } from "./constant/index.js";
