
/**
 * @packageDocumentation
 * @module deepseek-ai-roles-1.0.0
 * @author zkali
 * @tags ai, contract, safety, constraints
 * @description AI 强制安全约束契约 —— 硬编码，不可通过外部配置覆盖或关闭
 * @path src/ai/contract/role.ts
 */

import { type CONTRACTS } from "./contract.js";
import { type Docs } from "./docs.js";

/**
 * @interface Roles
 * @description 角色契约接口
 * @property {CONTRACTS} type - 契约类型，固定为 CONTRACTS.ROLES
 * @property {string} name - 角色契约名称，
 * @property {string} alias - 角色契约别名，UI展示使用，必须是一个合法的标识符，且在同一团队内唯一
 * @property {string} description - 角色契约描述，
 * @property {Docs} docs - 角色关联的知识库契约
 * @property {string} content - 角色契约内容，必须遵守的规则和限制
 */
export interface Roles {
    type: typeof CONTRACTS.ROLES;
    id: string;
    name: string;
    alias: string;
    description: string;
    docs: Docs;
    content: string;
}