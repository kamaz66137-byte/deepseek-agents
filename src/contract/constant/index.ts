/**
 * @packageDocumentation
 * @module constant-index
 * @author zkali
 * @tags ai, contract, constant, export
 * @description contract constant 模块统一导出入口
 * @path src/contract/constant/index.ts
 */

export { CONTRACTS, Contract } from "./contract.js";
export type { ContractType } from "./contract.js";

export { MemoryType } from "./memory-type.js";
export type { MemoryType as MemoryTypeValue } from "./memory-type.js";

export { Role } from "./role.js";
export type { RoleType } from "./role.js";

export { TeamRole } from "./teams-role.js";
export type { TeamRoleType } from "./teams-role.js";

export { SkillsType } from "./skills-types.js";
export type { SkillsType as SkillsTypeValue } from "./skills-types.js";

export { ToolsType } from "./tools-types.js";
export type { ToolsType as ToolsTypeValue } from "./tools-types.js";