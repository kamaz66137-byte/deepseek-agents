
/**
 * @packageDocumentation
 * @module constant-role
 * @author zkali
 * @tags ai, contract, role, constant
 * @description AI 强制安全约束契约 —— 硬编码，不可通过外部配置覆盖或关闭
 * @path src/contract/constant/role.ts
 */
/**
 * @const Role
 * @description deepseek AI 强制安全约束契约类型常量集合
 * @type {Object}
 * @property {string} USER - 团队契约  system
 * @property {string} SYSTEM - AI 角色契约
 */

export const Role = {
    USER: "User",
    SYSTEM: "System",
} as const;

export type RoleType = typeof Role[keyof typeof Role];
   
 