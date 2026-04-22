/**
 * @packageDocumentation
 * @module constant-skills-types
 * @author zkali
 * @tags ai, contract, skills, constant
 * @description 技能分类常量定义
 * @path src/contract/constant/skills-types.ts
 */

/**
 * @const SkillsType
 * @description 技能类型常量
 * @property {string} THINK - 推理类技能
 * @property {string} PLAN - 规划类技能
 * @property {string} EXECUTE - 执行类技能
 * @property {string} REVIEW - 审核类技能
 * @property {string} MEMORY - 记忆类技能
 */
export const SkillsType = {
    THINK: "think",
    PLAN: "plan",
    EXECUTE: "execute",
    REVIEW: "review",
    MEMORY: "memory",
} as const;

export type SkillsType = typeof SkillsType[keyof typeof SkillsType];