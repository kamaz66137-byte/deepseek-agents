
/**
 * @packageDocumentation
 * @module deepseek-teams-docs-1.0.0
 * @author zkali
 * @tags ai, contract, safety, constraints
 * @description AI 强制安全约束契约 —— 硬编码，不可通过外部配置覆盖或关闭
 * @path src/ai/contract/teams.ts
 */


/**
 * @interface Teams
 * @description 团队契约接口
 * @property {string} id - id
 * @property {string} name - 团队契约名称，
 * @property {string} description - 团队契约描述，
 * @property {string} logo  - 团队契约徽标，必须是一个合法的 URL 或文件路径
 * @property {string[]} agents - 团队成员列表，多个成员用逗号分隔
 * @property {string[]} tags - 团队标签列表，多个标签用逗号分隔
 * @property {string} content - 团队契约内容，必须遵守的规则和限制
 */
export interface Teams {
    id: string;
    name: string;
    description: string ;
    logo: string;
    agents: string[];
    content: string;
    tags: string[];
}