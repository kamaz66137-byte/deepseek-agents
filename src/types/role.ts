/**
 * @packageDocumentation
 * @module runtime-role-types
 * @author zkali
 * @tags ai, runtime, role, types
 * @description Role 运行时类型定义，包含角色结构和增改入参
 * @path src/types/role.ts
 */

import type { DocRecord } from "./docs.js";

/**
 * @interface RoleRecord
 * @description 角色记录结构
 * @property {string} id - 角色唯一标识
 * @property {string} name - 角色名称
 * @property {string} alias - 角色别名
 * @property {string} description - 角色描述
 * @property {DocRecord} docs - 绑定的文档
 * @property {string} content - 角色内容
 */
export interface RoleRecord {
    readonly id: string;
    readonly name: string;
    readonly alias: string;
    readonly description: string;
    readonly docs: DocRecord;
    readonly content: string;
}

/**
 * @interface CreateRoleInput
 * @description 创建角色输入
 * @property {string} id - 角色主键
 * @property {string} name - 角色名称
 * @property {string} alias - 角色别名
 * @property {string} description - 角色描述
 * @property {DocRecord} docs - 绑定文档
 * @property {string} content - 角色内容
 */
export interface CreateRoleInput {
    readonly id: string;
    readonly name: string;
    readonly alias: string;
    readonly description: string;
    readonly docs: DocRecord;
    readonly content: string;
}

/**
 * @interface UpdateRoleInput
 * @description 更新角色输入
 * @property {string} id - 角色主键
 * @property {string} [description] - 角色描述
 * @property {DocRecord} [docs] - 绑定文档
 * @property {string} [content] - 角色内容
 */
export interface UpdateRoleInput {
    readonly id: string;
    readonly description?: string;
    readonly docs?: DocRecord;
    readonly content?: string;
}