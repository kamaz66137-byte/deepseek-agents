/**
 * @packageDocumentation
 * @module deepseek-ai-contract-1.0.0
 * @author zkali
 * @tags ai, contract, safety, constraints
 * @description AI 强制安全约束契约 —— 硬编码，不可通过外部配置覆盖或关闭
 * @path src/ai/contract/contract.ts
 */
/**
 * @const CONTRACTS
 * @description deepseek AI 强制安全约束契约类型常量集合
 * @property {string} TEAMS - 团队契约
 * @property {string} ROLES - AI 角色契约
 * @property {string} AGENTS - AI 代理契约
 * @property {string} DOCS - 知识库契约
 * @property {string} SKILLS - 技能契约
 * @property {string} RULES - 必须遵守的规则契约
 * @property {string} TOOLS - 工具集契约
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
