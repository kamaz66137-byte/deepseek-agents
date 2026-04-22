/**
 * @packageDocumentation
 * @module runtime-team-types
 * @author zkali
 * @tags ai, runtime, team, types
 * @description Team 运行时类型定义，包含团队结构和增改入参
 * @path src/types/team.ts
 */

/**
 * @interface TeamRecord
 * @description 团队记录结构
 * @property {string} id - 团队 ID
 * @property {string} name - 团队名称
 * @property {string} description - 团队描述
 * @property {string} logo - 团队徽标
 * @property {string[]} agents - 团队成员 Agent 列表
 * @property {string[]} tags - 团队标签
 * @property {string} content - 团队内容
 */
export interface TeamRecord {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly logo: string;
    readonly agents: readonly string[];
    readonly tags: readonly string[];
    readonly content: string;
}

/**
 * @interface CreateTeamInput
 * @description 创建团队输入
 * @property {string} id - 团队主键
 * @property {string} name - 团队名称
 * @property {string} description - 团队描述
 * @property {string} logo - 团队徽标
 * @property {string[]} [agents] - 团队成员 Agent 列表
 * @property {string[]} [tags] - 团队标签
 * @property {string} content - 团队内容
 */
export interface CreateTeamInput {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly logo: string;
    readonly agents?: readonly string[];
    readonly tags?: readonly string[];
    readonly content: string;
}

/**
 * @interface UpdateTeamInput
 * @description 更新团队输入
 * @property {string} id - 团队主键
 * @property {string} [description] - 团队描述
 * @property {string} [logo] - 团队徽标
 * @property {string[]} [agents] - 团队成员 Agent 列表
 * @property {string[]} [tags] - 团队标签
 * @property {string} [content] - 团队内容
 */
export interface UpdateTeamInput {
    readonly id: string;
    readonly description?: string;
    readonly logo?: string;
    readonly agents?: readonly string[];
    readonly tags?: readonly string[];
    readonly content?: string;
}