/**
 * @packageDocumentation
 * @module runtime-docs-types
 * @author zkali
 * @tags ai, runtime, docs, types
 * @description Docs 运行时类型定义，包含文档结构和增改入参
 * @path src/types/docs.ts
 */

/**
 * @interface DocRecord
 * @description 文档记录结构
 * @property {string} id - 文档唯一标识
 * @property {string} name - 文档名称
 * @property {string} alias - 文档别名
 * @property {string} classifying - 文档分类
 * @property {string} description - 文档描述
 * @property {string} tags - 文档标签
 * @property {string} path - 文档路径
 * @property {string} content - 文档内容
 */
export interface DocRecord {
    readonly id: string;
    readonly name: string;
    readonly alias: string;
    readonly classifying: string;
    readonly description: string;
    readonly tags: string;
    readonly path: string;
    readonly content: string;
}

/**
 * @interface CreateDocInput
 * @description 创建文档输入
 * @property {string} id - 文档主键
 * @property {string} name - 文档名称
 * @property {string} alias - 文档别名
 * @property {string} classifying - 文档分类
 * @property {string} description - 文档描述
 * @property {string} tags - 文档标签
 * @property {string} path - 文档路径
 * @property {string} content - 文档内容
 */
export interface CreateDocInput {
    readonly id: string;
    readonly name: string;
    readonly alias: string;
    readonly classifying: string;
    readonly description: string;
    readonly tags: string;
    readonly path: string;
    readonly content: string;
}

/**
 * @interface UpdateDocInput
 * @description 更新文档输入
 * @property {string} id - 文档主键
 * @property {string} [classifying] - 文档分类
 * @property {string} [description] - 文档描述
 * @property {string} [tags] - 文档标签
 * @property {string} [path] - 文档路径
 * @property {string} [content] - 文档内容
 */
export interface UpdateDocInput {
    readonly id: string;
    readonly classifying?: string;
    readonly description?: string;
    readonly tags?: string;
    readonly path?: string;
    readonly content?: string;
}