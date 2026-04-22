
/**
 * @packageDocumentation
 * @module deepseek-skills-docs-1.0.0
 * @author zkali
 * @tags ai, contract, safety, constraints
 * @description AI 强制安全约束契约 —— 硬编码，不可通过外部配置覆盖或关闭
 * @path src/ai/skills/docs   .ts
 */

import { type CONTRACTS } from "./contract.js";

/**
 * @interface Skills
 * @description 技能契约接口
 * @property {typeof CONTRACTS.SKILLS} type - 契约类型，固定为 CONTRACTS.SKILLS
 * @property {string} id - id
 * @property {string|null} pid - 父级技能契约 id
 * @property {string} skilltype - 技能类型
 * @property {number} sort - 排序
 * @property {string} name - 技能契约名称， 
 * @property {string} alias - 技能契约别名，UI展示使用，必须是一个合法的标识符，且在同一团队内唯一
 * @property {string} description - 技能契约描述，
 * @property {string} logo - 技能契约图标，必须是一个合法的 URL 或文件路径
 * @property {string} tags  - 技能契约标签，多个标签用逗号分隔
 * @property {string} path - 技能路径，必须是一个合法的 URL 或文件路径
 * @property {string} content - 技能契约内容，必须遵守的规则和限制
 * @property {Date} create - 技能契约创建时间
 * @property {Date} update - 技能契约更新迭代时间
 */
export interface Skills {
    type: typeof CONTRACTS.SKILLS;
    id: string  ;
    pid: string | null;
    sort: number;
    skilltype: string;
    name: string;
    alias: string;
    description: string ;
    logo: string;
    tags: string;
    path: string;
    content: string;
    create: Date;
    update: Date;
}