
/**
 * @packageDocumentation
 * @module constant-teams-role
 * @author zkali
 * @tags ai, contract, role, constant
 * @description AI 强制安全约束契约 —— 硬编码，不可通过外部配置覆盖或关闭
 * @path src/contract/constant/role.ts
 */
/**
 * @const TeamsRole
 * @description deepseek AI 强制安全约束契约类型常量集合
 * @type {Object}
 * @property {string} PLAN - 团队计划角色
 * @property {string} IMPLEMENT - 团队执行角色
 * @property {string} ACCEPTANCE - 团队验收角色
 * @property {string} REVIEW - 团队审查角色
 */

export const TeamRole = {
    PLAN: "plan",
    IMPLEMENT: "implement",
    ACCEPTANCE: "acceptance",
    REVIEW: "review",
} as const;

export type TeamRoleType = typeof TeamRole[keyof typeof TeamRole];
   
 