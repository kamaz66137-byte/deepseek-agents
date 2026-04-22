/**
 * @packageDocumentation
 * @module runtime-memory-manager
 * @since 1.0.0
 * @author zkali
 * @tags [runtime, memory, manager]
 * @description 记忆管理器，封装 CRUD 操作并注入作用域上下文
 * @path src/runtime/memory-manager.ts
 */

import { randomUUID } from "crypto";
import type { MemoryRepository } from "../db/index.js";
import type { MemoryEntry, MemoryQueryResult } from "../types/index.js";
import { MemoryScope } from "../types/index.js";

/**
 * @interface MemoryManagerOptions
 * @description 记忆管理器初始化选项
 * @property {MemoryRepository} repo - 记忆仓库
 */
export interface MemoryManagerOptions {
    readonly repo: MemoryRepository;
}

/**
 * @class MemoryManager
 * @description 记忆管理器，提供分层记忆的读写查删操作
 */
export class MemoryManager {
    readonly #repo: MemoryRepository;

    /**
     * @constructor
     * @param {MemoryManagerOptions} options - 初始化选项
     */
    constructor(options: MemoryManagerOptions) {
        this.#repo = options.repo;
    }

    /**
     * @function save
     * @description 保存记忆条目（存在则覆盖）
     * @param {MemoryScope} scope - 作用域
     * @param {string} ownerId - 所属对象 ID
     * @param {string} key - 记忆键
     * @param {string} value - 记忆值
     * @param {string[]} [tags] - 标签列表
     * @returns {MemoryEntry} 保存后的记忆条目
     */
    save(scope: MemoryScope, ownerId: string, key: string, value: string, tags?: string[]): MemoryEntry {
        return this.#repo.save({
            id: randomUUID(),
            scope,
            ownerId,
            key,
            value,
            ...(tags != null ? { tags } : {}),
        });
    }

    /**
     * @function get
     * @description 根据 scope+ownerId+key 精确获取记忆
     * @param {MemoryScope} scope - 作用域
     * @param {string} ownerId - 所属对象 ID
     * @param {string} key - 记忆键
     * @returns {MemoryEntry | undefined} 记忆条目或 undefined
     */
    get(scope: MemoryScope, ownerId: string, key: string): MemoryEntry | undefined {
        return this.#repo.findByKey(scope, ownerId, key);
    }

    /**
     * @function query
     * @description 查询指定 scope+ownerId 下的记忆列表
     * @param {MemoryScope} scope - 作用域
     * @param {string} ownerId - 所属对象 ID
     * @param {string} [key] - 可选键过滤
     * @returns {MemoryQueryResult} 查询结果
     */
    query(scope: MemoryScope, ownerId: string, key?: string): MemoryQueryResult {
        return this.#repo.query({
            id: randomUUID(),
            scope,
            ownerId,
            ...(key != null ? { key } : {}),
        });
    }

    /**
     * @function remove
     * @description 删除指定记忆
     * @param {MemoryScope} scope - 作用域
     * @param {string} ownerId - 所属对象 ID
     * @param {string} key - 记忆键
     * @returns {boolean} 是否删除成功
     */
    remove(scope: MemoryScope, ownerId: string, key: string): boolean {
        return this.#repo.remove({
            id: randomUUID(),
            scope,
            ownerId,
            key,
        });
    }

    /**
     * @function buildContextBlock
     * @description 将 Agent 记忆转换为上下文注入文本块（用于系统提示词）
     * @param {string} agentId - Agent ID
     * @param {number} [maxEntries=20] - 最大记忆条数
     * @returns {string} 记忆上下文文本
     */
    buildContextBlock(agentId: string, maxEntries = 20): string {
        const result = this.query(MemoryScope.AGENT, agentId);
        const entries = result.items.slice(0, maxEntries);
        if (entries.length === 0) return "";
        const lines = entries.map((e) => `- [${e.key}]: ${e.value}`).join("\n");
        return `\n\n## 已有记忆\n${lines}`;
    }

    /**
     * @function buildTeamContextBlock
     * @description 将团队共享记忆转换为上下文注入文本块
     * @param {string} teamId - 团队 ID
     * @param {number} [maxEntries=20] - 最大记忆条数
     * @returns {string} 团队记忆上下文文本
     */
    buildTeamContextBlock(teamId: string, maxEntries = 20): string {
        const result = this.query(MemoryScope.TEAM, teamId);
        const entries = result.items.slice(0, maxEntries);
        if (entries.length === 0) return "";
        const lines = entries.map((e) => `- [${e.key}]: ${e.value}`).join("\n");
        return `\n\n## 团队共享记忆\n${lines}`;
    }
}
