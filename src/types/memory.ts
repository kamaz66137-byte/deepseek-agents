/**
 * @packageDocumentation
 * @module runtime-memory-types
 * @author zkali
 * @tags ai, runtime, memory, types
 * @description 记忆运行时类型定义，包含保存、查询、删除与结果结构
 * @path src/types/memory.ts
 */

/**
 * @const MemoryScope
 * @description 记忆作用域
 * @property {string} AGENT - Agent 私有记忆
 * @property {string} TEAM - 团队共享记忆
 * @property {string} USER - 用户级记忆
 * @property {string} GLOBAL - 全局记忆
 * @property {string} SEMANTIC - 语义记忆（支持关键词/语义搜索，跨 owner 检索）
 */
export const MemoryScope = {
    AGENT: "agent",
    TEAM: "team",
    USER: "user",
    GLOBAL: "global",
    SEMANTIC: "semantic",
} as const;

export type MemoryScope = typeof MemoryScope[keyof typeof MemoryScope];

/**
 * @interface MemoryEntry
 * @description 运行时记忆结构
 * @property {string} id - 记忆唯一标识
 * @property {MemoryScope} scope - 记忆作用域
 * @property {string} ownerId - 记忆所属对象 ID
 * @property {string} key - 记忆键
 * @property {string} value - 记忆值
 * @property {string[]} [tags] - 记忆标签
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 */
export interface MemoryEntry {
    readonly id: string;
    readonly scope: MemoryScope;
    readonly ownerId: string;
    readonly key: string;
    readonly value: string;
    readonly tags?: readonly string[];
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

/**
 * @interface SaveMemoryInput
 * @description 保存记忆输入
 * @property {string} id - 记忆主键
 * @property {MemoryScope} scope - 记忆作用域
 * @property {string} ownerId - 记忆所属对象 ID
 * @property {string} key - 记忆键
 * @property {string} value - 记忆值
 * @property {string[]} [tags] - 记忆标签
 */
export interface SaveMemoryInput {
    readonly id: string;
    readonly scope: MemoryScope;
    readonly ownerId: string;
    readonly key: string;
    readonly value: string;
    readonly tags?: readonly string[];
}

/**
 * @interface QueryMemoryInput
 * @description 查询记忆输入
 * @property {string} id - 查询主键
 * @property {MemoryScope} scope - 记忆作用域
 * @property {string} ownerId - 记忆所属对象 ID
 * @property {string} [key] - 可选记忆键
 * @property {string[]} [tags] - 可选标签筛选
 */
export interface QueryMemoryInput {
    readonly id: string;
    readonly scope: MemoryScope;
    readonly ownerId: string;
    readonly key?: string;
    readonly tags?: readonly string[];
}

/**
 * @interface DeleteMemoryInput
 * @description 删除记忆输入
 * @property {string} id - 记忆主键
 * @property {MemoryScope} scope - 记忆作用域
 * @property {string} ownerId - 记忆所属对象 ID
 * @property {string} key - 记忆键
 */
export interface DeleteMemoryInput {
    readonly id: string;
    readonly scope: MemoryScope;
    readonly ownerId: string;
    readonly key: string;
}

/**
 * @interface MemoryQueryResult
 * @description 记忆查询结果
 * @property {string} id - 结果集唯一标识
 * @property {MemoryEntry[]} items - 记忆结果列表
 * @property {number} total - 结果总数
 */
export interface MemoryQueryResult {
    readonly id: string;
    readonly items: readonly MemoryEntry[];
    readonly total: number;
}