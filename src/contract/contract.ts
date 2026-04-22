/**
 * @packageDocumentation
 * @module deepseek-ai-contract-1.0.0
 * @author zkali
 * @tags ai, contract, constant
 * @description 契约类型常量统一入口
 * @path src/contract/contract.ts
 */

/**
 * @const CONTRACTS
 * @description deepseek AI 契约类型常量集合
 * @property {string} TEAMS - 团队契约
 * @property {string} ROLES - 角色契约
 * @property {string} AGENTS - 代理契约
 * @property {string} DOCS - 文档契约
 * @property {string} SKILLS - 技能契约
 * @property {string} RULES - 规则契约
 * @property {string} TOOLS - 工具契约
 * @property {string} MEMORYS - 记忆契约
 * @property {string} TASKS - 任务契约
 */
export const CONTRACTS = {
    TEAMS: "Teams",
    ROLES: "Roles",
    AGENTS: "Agents",
    DOCS: "Docs",
    SKILLS: "Skills",
    RULES: "Rules",
    TOOLS: "Tools",
    MEMORYS: "Memorys",
    TASKS: "Tasks",
} as const;

export const Contract = CONTRACTS;

export type ContractType = typeof CONTRACTS[keyof typeof CONTRACTS];