/**
 * @packageDocumentation
 * @module deepseek-ai-docs-1.0.0
 * @author zkali
 * @tags ai, contract, safety, constraints
 * @description AI 强制安全约束契约 —— 硬编码，不可通过外部配置覆盖或关闭
 * @path src/ai/contract/docs   .ts
 */
import { type CONTRACTS } from "./contract.js";
/**
 * @interface Docs
 * @description 知识库契约接口
 * @property {CONTRACTS} type - 知识库契约类型，固定为 CONTRACTS.DOCS
 * @property {string} name - 知识库契约名称，
 * @property {string} alias - 知识库契约别名,UI展示使用，必须是一个合法的标识符，且在同一团队内唯一
 * @property {string} classifying - 知识库契约分类,
 * @property {string} description - 知识库契约描述，
 * @property {string} path - 知识库路径，必须是一个合法的 URL 或文件路径
 * @property {string} tags  - 知识库契约标签，多个标签用逗号分隔
 * @property {string} path - 知识库路径，必须是一个合法的 URL 或文件路径
 * @property {string} content - 知识库契约内容，必须遵守的规则和限制
 */
export interface Docs {
    type: typeof CONTRACTS.DOCS;
    id: string;
    name: string;
    alias: string;
    classifying: string;
    description: string;
    tags: string;
    path: string;
    content: string;
}
