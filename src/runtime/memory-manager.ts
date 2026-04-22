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

    /**
     * @function saveSemanticMemory
     * @description 保存语义记忆条目（使用 SEMANTIC 作用域，可跨 owner 检索）
     * @param {string} ownerId - 所属对象 ID（通常为 agentId 或 teamId）
     * @param {string} key - 记忆键
     * @param {string} value - 记忆值（自然语言描述）
     * @param {string[]} [tags] - 标签列表
     * @returns {MemoryEntry} 保存后的记忆条目
     */
    saveSemanticMemory(ownerId: string, key: string, value: string, tags?: string[]): MemoryEntry {
        return this.save(MemoryScope.SEMANTIC, ownerId, key, value, tags);
    }

    /**
     * @function searchSemantic
     * @description 在语义记忆中按关键词搜索（基于 SQLite LIKE 全文检索）。
     *              扩展点：可替换为 sqlite-vss 或外部向量库（Qdrant/Chroma）以支持真正的向量检索。
     * @param {string} query - 搜索关键词（空格分隔，各词取 OR 语义）
     * @param {string} [ownerId] - 可选：限制在某个 owner 范围内检索
     * @param {number} [maxResults=10] - 最大返回条数
     * @returns {MemoryEntry[]} 匹配的记忆条目列表（按更新时间降序）
     */
    searchSemantic(query: string, ownerId?: string, maxResults = 10): MemoryEntry[] {
        const keywords = query.trim().split(/\s+/).filter(Boolean);
        if (keywords.length === 0) return [];

        // 查询该 owner（或所有 SEMANTIC 记忆）中的候选集
        let candidates: MemoryEntry[];
        if (ownerId != null) {
            const result = this.#repo.query({ id: randomUUID(), scope: MemoryScope.SEMANTIC, ownerId });
            candidates = [...result.items];
        } else {
            // 当 ownerId 未指定时，查询所有 semantic 作用域记忆（通过空 ownerId 回退到全量查询接口）
            const result = this.#repo.queryByScope(MemoryScope.SEMANTIC);
            candidates = [...result.items];
        }

        // 按关键词在 key+value 中匹配，命中关键词越多排序越靠前
        const scored = candidates
            .map((entry) => {
                const text = `${entry.key} ${entry.value}`.toLowerCase();
                const score = keywords.reduce((acc, kw) => acc + (text.includes(kw.toLowerCase()) ? 1 : 0), 0);
                return { entry, score };
            })
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score || b.entry.updatedAt.getTime() - a.entry.updatedAt.getTime());

        return scored.slice(0, maxResults).map(({ entry }) => entry);
    }
}
