/**
 * @packageDocumentation
 * @module db-memory-repository
 * @since 1.0.0
 * @author zkali
 * @tags [db, repository, memory]
 * @description Memory 实体的 SQLite CRUD 操作
 * @path src/db/repositories/memory.ts
 */

import type Database from "better-sqlite3";
import type { MemoryRow } from "../schema.js";
import type { MemoryEntry, SaveMemoryInput, QueryMemoryInput, DeleteMemoryInput, MemoryQueryResult } from "../../types/index.js";
import { MemoryScope } from "../../types/index.js";

/**
 * @function toMemoryEntry
 * @description 将数据库行转换为 MemoryEntry
 * @param {MemoryRow} row - 数据库行
 * @returns {MemoryEntry} 记忆条目
 */
function toMemoryEntry(row: MemoryRow): MemoryEntry {
    return {
        id: row.id,
        scope: row.scope as MemoryEntry["scope"],
        ownerId: row.owner_id,
        key: row.key,
        value: row.value,
        tags: JSON.parse(row.tags) as string[],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * @interface MemoryRepository
 * @description Memory 数据仓库接口
 */
export interface MemoryRepository {
    /**
     * @function save
     * @description 保存或更新记忆条目（按 scope+ownerId+key 唯一约束）
     * @param {SaveMemoryInput} input - 保存输入
     * @returns {MemoryEntry} 记忆条目
     */
    save(input: SaveMemoryInput): MemoryEntry;

    /**
     * @function findByKey
     * @description 根据 scope+ownerId+key 精确查找记忆
     * @param {string} scope - 作用域
     * @param {string} ownerId - 所属对象 ID
     * @param {string} key - 键
     * @returns {MemoryEntry | undefined} 记忆条目或 undefined
     */
    findByKey(scope: string, ownerId: string, key: string): MemoryEntry | undefined;

    /**
     * @function query
     * @description 按条件查询记忆列表
     * @param {QueryMemoryInput} input - 查询输入
     * @returns {MemoryQueryResult} 查询结果
     */
    query(input: QueryMemoryInput): MemoryQueryResult;

    /**
     * @function remove
     * @description 删除指定记忆
     * @param {DeleteMemoryInput} input - 删除输入
     * @returns {boolean} 是否删除成功
     */
    remove(input: DeleteMemoryInput): boolean;
}

/**
 * @function createMemoryRepository
 * @description 创建 Memory 数据仓库
 * @param {Database.Database} db - SQLite 连接
 * @returns {MemoryRepository} 记忆仓库实例
 */
export function createMemoryRepository(db: Database.Database): MemoryRepository {
    const saveStmt = db.prepare<[string, string, string, string, string, string, string, string]>(`
        INSERT INTO memories (id, scope, owner_id, key, value, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(scope, owner_id, key) DO UPDATE SET
            id         = excluded.id,
            value      = excluded.value,
            tags       = excluded.tags,
            updated_at = excluded.updated_at
    `);

    const findByKeyStmt = db.prepare<[string, string, string], MemoryRow>(`
        SELECT * FROM memories WHERE scope = ? AND owner_id = ? AND key = ?
    `);

    const queryBaseStmt = db.prepare<[string, string], MemoryRow>(`
        SELECT * FROM memories WHERE scope = ? AND owner_id = ? ORDER BY updated_at DESC
    `);

    const queryByKeyStmt = db.prepare<[string, string, string], MemoryRow>(`
        SELECT * FROM memories WHERE scope = ? AND owner_id = ? AND key = ? ORDER BY updated_at DESC
    `);

    const deleteStmt = db.prepare<[string, string, string]>(`
        DELETE FROM memories WHERE scope = ? AND owner_id = ? AND key = ?
    `);

    return {
        save(input: SaveMemoryInput): MemoryEntry {
            const now = new Date().toISOString();
            saveStmt.run(
                input.id,
                input.scope,
                input.ownerId,
                input.key,
                input.value,
                JSON.stringify(input.tags ?? []),
                now,
                now,
            );
            const row = findByKeyStmt.get(input.scope, input.ownerId, input.key);
            if (!row) throw new Error(`Memory save failed for scope=${input.scope} owner=${input.ownerId} key=${input.key}`);
            return toMemoryEntry(row);
        },

        findByKey(scope: string, ownerId: string, key: string): MemoryEntry | undefined {
            const row = findByKeyStmt.get(scope, ownerId, key);
            return row ? toMemoryEntry(row) : undefined;
        },

        query(input: QueryMemoryInput): MemoryQueryResult {
            let rows: MemoryRow[];
            if (input.key != null) {
                rows = queryByKeyStmt.all(input.scope, input.ownerId, input.key);
            } else {
                rows = queryBaseStmt.all(input.scope, input.ownerId);
            }
            const items = rows.map(toMemoryEntry);
            return { id: input.id, items, total: items.length };
        },

        remove(input: DeleteMemoryInput): boolean {
            const result = deleteStmt.run(input.scope, input.ownerId, input.key);
            return result.changes > 0;
        },
    };
}

export { MemoryScope };
