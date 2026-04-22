/**
 * @packageDocumentation
 * @module db-tool-repository
 * @since 1.0.0
 * @author zkali
 * @tags [db, repository, tool, skill, registry]
 * @description 工具包与技能包的 SQLite 持久化仓库，支持运行时动态加载与卸载
 * @path src/db/repositories/tool.ts
 */

import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { ToolBundleRow, SkillBundleRow } from "../schema.js";
import type { ToolDefinition, SkillDefinition } from "../../types/index.js";

/**
 * @interface PersistedToolDefinition
 * @description 可序列化的工具定义（不含 execute 函数，用于持久化）
 * @property {string} id - 工具唯一标识
 * @property {string} name - 工具名称
 * @property {string} description - 工具描述
 * @property {Record<string, { id: string; type: string; description: string }>} parameters - 参数定义
 * @property {string[]} [required] - 必填参数列表
 */
export interface PersistedToolDefinition {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, { id: string; type: string; description: string }>;
    readonly required?: readonly string[];
}

/**
 * @interface PersistedSkillDefinition
 * @description 可序列化的技能定义（用于持久化）
 * @property {string} id - 技能唯一标识
 * @property {string} name - 技能名称
 * @property {string} description - 技能描述
 * @property {string} [content] - 技能内容/提示词
 */
export interface PersistedSkillDefinition {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly content?: string;
}

/**
 * @interface ToolBundleRecord
 * @description 工具包持久化记录
 * @property {string} id - 记录主键
 * @property {string} bundleName - 工具包名称
 * @property {PersistedToolDefinition[]} tools - 工具定义列表（不含 execute）
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 */
export interface ToolBundleRecord {
    readonly id: string;
    readonly bundleName: string;
    readonly tools: readonly PersistedToolDefinition[];
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

/**
 * @interface SkillBundleRecord
 * @description 技能包持久化记录
 * @property {string} id - 记录主键
 * @property {string} bundleName - 技能包名称
 * @property {PersistedSkillDefinition[]} skills - 技能定义列表
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 */
export interface SkillBundleRecord {
    readonly id: string;
    readonly bundleName: string;
    readonly skills: readonly PersistedSkillDefinition[];
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

/**
 * @interface ToolBundleRepository
 * @description 工具包数据仓库接口，支持工具包的持久化、查询与删除
 */
export interface ToolBundleRepository {
    /**
     * @function save
     * @description 保存或更新工具包（按 bundleName 唯一约束）
     * @param {string} bundleName - 工具包名称
     * @param {ToolDefinition[]} tools - 工具定义列表
     * @returns {ToolBundleRecord} 保存后的记录
     */
    save(bundleName: string, tools: readonly ToolDefinition[]): ToolBundleRecord;

    /**
     * @function findByName
     * @description 根据包名查找工具包记录
     * @param {string} bundleName - 工具包名称
     * @returns {ToolBundleRecord | undefined} 工具包记录或 undefined
     */
    findByName(bundleName: string): ToolBundleRecord | undefined;

    /**
     * @function listAll
     * @description 列出所有工具包
     * @returns {ToolBundleRecord[]} 工具包列表
     */
    listAll(): ToolBundleRecord[];

    /**
     * @function remove
     * @description 删除指定工具包
     * @param {string} bundleName - 工具包名称
     * @returns {boolean} 是否删除成功
     */
    remove(bundleName: string): boolean;
}

/**
 * @interface SkillBundleRepository
 * @description 技能包数据仓库接口，支持技能包的持久化、查询与删除
 */
export interface SkillBundleRepository {
    /**
     * @function save
     * @description 保存或更新技能包（按 bundleName 唯一约束）
     * @param {string} bundleName - 技能包名称
     * @param {SkillDefinition[]} skills - 技能定义列表
     * @returns {SkillBundleRecord} 保存后的记录
     */
    save(bundleName: string, skills: readonly SkillDefinition[]): SkillBundleRecord;

    /**
     * @function findByName
     * @description 根据包名查找技能包记录
     * @param {string} bundleName - 技能包名称
     * @returns {SkillBundleRecord | undefined} 技能包记录或 undefined
     */
    findByName(bundleName: string): SkillBundleRecord | undefined;

    /**
     * @function listAll
     * @description 列出所有技能包
     * @returns {SkillBundleRecord[]} 技能包列表
     */
    listAll(): SkillBundleRecord[];

    /**
     * @function remove
     * @description 删除指定技能包
     * @param {string} bundleName - 技能包名称
     * @returns {boolean} 是否删除成功
     */
    remove(bundleName: string): boolean;
}

/**
 * @function toToolBundleRecord
 * @description 将数据库行转换为 ToolBundleRecord
 * @param {ToolBundleRow} row - 数据库行
 * @returns {ToolBundleRecord} 工具包记录
 */
function toToolBundleRecord(row: ToolBundleRow): ToolBundleRecord {
    return {
        id: row.id,
        bundleName: row.bundle_name,
        tools: JSON.parse(row.tools_json) as PersistedToolDefinition[],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * @function toSkillBundleRecord
 * @description 将数据库行转换为 SkillBundleRecord
 * @param {SkillBundleRow} row - 数据库行
 * @returns {SkillBundleRecord} 技能包记录
 */
function toSkillBundleRecord(row: SkillBundleRow): SkillBundleRecord {
    return {
        id: row.id,
        bundleName: row.bundle_name,
        skills: JSON.parse(row.skills_json) as PersistedSkillDefinition[],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * @function serializeTools
 * @description 将运行时 ToolDefinition 列表序列化为可持久化结构（剔除 execute 函数）
 * @param {readonly ToolDefinition[]} tools - 工具定义列表
 * @returns {PersistedToolDefinition[]} 可序列化的工具定义
 */
function serializeTools(tools: readonly ToolDefinition[]): PersistedToolDefinition[] {
    return tools.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        parameters: Object.fromEntries(
            Object.entries(t.parameters).map(([k, p]) => [k, { id: p.id, type: p.type, description: p.description }]),
        ),
        ...(t.required ? { required: [...t.required] } : {}),
    }));
}

/**
 * @function serializeSkills
 * @description 将运行时 SkillDefinition 列表序列化为可持久化结构
 * @param {readonly SkillDefinition[]} skills - 技能定义列表
 * @returns {PersistedSkillDefinition[]} 可序列化的技能定义
 */
function serializeSkills(skills: readonly SkillDefinition[]): PersistedSkillDefinition[] {
    return skills.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        ...(s.content ? { content: s.content } : {}),
    }));
}

/**
 * @function createToolBundleRepository
 * @description 创建工具包数据仓库
 * @param {Database.Database} db - SQLite 连接
 * @returns {ToolBundleRepository} 工具包仓库实例
 */
export function createToolBundleRepository(db: Database.Database): ToolBundleRepository {
    const upsertStmt = db.prepare<[string, string, string, string, string]>(`
        INSERT INTO tool_bundles (id, bundle_name, tools_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(bundle_name) DO UPDATE SET
            tools_json = excluded.tools_json,
            updated_at = excluded.updated_at
    `);

    const findByNameStmt = db.prepare<[string], ToolBundleRow>(`SELECT * FROM tool_bundles WHERE bundle_name = ?`);
    const listAllStmt = db.prepare<[], ToolBundleRow>(`SELECT * FROM tool_bundles ORDER BY bundle_name ASC`);
    const removeStmt = db.prepare<[string]>(`DELETE FROM tool_bundles WHERE bundle_name = ?`);

    return {
        save(bundleName: string, tools: readonly ToolDefinition[]): ToolBundleRecord {
            const now = new Date().toISOString();
            const serialized = serializeTools(tools);
            upsertStmt.run(randomUUID(), bundleName, JSON.stringify(serialized), now, now);
            const row = findByNameStmt.get(bundleName);
            if (!row) throw new Error(`ToolBundle save failed for bundle_name=${bundleName}`);
            return toToolBundleRecord(row);
        },

        findByName(bundleName: string): ToolBundleRecord | undefined {
            const row = findByNameStmt.get(bundleName);
            return row ? toToolBundleRecord(row) : undefined;
        },

        listAll(): ToolBundleRecord[] {
            return listAllStmt.all().map(toToolBundleRecord);
        },

        remove(bundleName: string): boolean {
            const result = removeStmt.run(bundleName);
            return result.changes > 0;
        },
    };
}

/**
 * @function createSkillBundleRepository
 * @description 创建技能包数据仓库
 * @param {Database.Database} db - SQLite 连接
 * @returns {SkillBundleRepository} 技能包仓库实例
 */
export function createSkillBundleRepository(db: Database.Database): SkillBundleRepository {
    const upsertStmt = db.prepare<[string, string, string, string, string]>(`
        INSERT INTO skill_bundles (id, bundle_name, skills_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(bundle_name) DO UPDATE SET
            skills_json = excluded.skills_json,
            updated_at  = excluded.updated_at
    `);

    const findByNameStmt = db.prepare<[string], SkillBundleRow>(`SELECT * FROM skill_bundles WHERE bundle_name = ?`);
    const listAllStmt = db.prepare<[], SkillBundleRow>(`SELECT * FROM skill_bundles ORDER BY bundle_name ASC`);
    const removeStmt = db.prepare<[string]>(`DELETE FROM skill_bundles WHERE bundle_name = ?`);

    return {
        save(bundleName: string, skills: readonly SkillDefinition[]): SkillBundleRecord {
            const now = new Date().toISOString();
            const serialized = serializeSkills(skills);
            upsertStmt.run(randomUUID(), bundleName, JSON.stringify(serialized), now, now);
            const row = findByNameStmt.get(bundleName);
            if (!row) throw new Error(`SkillBundle save failed for bundle_name=${bundleName}`);
            return toSkillBundleRecord(row);
        },

        findByName(bundleName: string): SkillBundleRecord | undefined {
            const row = findByNameStmt.get(bundleName);
            return row ? toSkillBundleRecord(row) : undefined;
        },

        listAll(): SkillBundleRecord[] {
            return listAllStmt.all().map(toSkillBundleRecord);
        },

        remove(bundleName: string): boolean {
            const result = removeStmt.run(bundleName);
            return result.changes > 0;
        },
    };
}
