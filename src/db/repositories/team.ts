/**
 * @packageDocumentation
 * @module db-team-repository
 * @since 1.0.0
 * @author zkali
 * @tags [db, repository, team]
 * @description Team 实体的 SQLite CRUD 操作
 * @path src/db/repositories/team.ts
 */

import type Database from "better-sqlite3";
import type { TeamRow } from "../schema.js";
import type { TeamRecord, CreateTeamInput, UpdateTeamInput } from "../../types/index.js";

/**
 * @function toTeamRecord
 * @description 将数据库行转换为 TeamRecord 运行时对象
 * @param {TeamRow} row - 数据库行
 * @returns {TeamRecord} 团队记录
 */
function toTeamRecord(row: TeamRow): TeamRecord {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        logo: row.logo,
        content: row.content,
        agents: JSON.parse(row.tags) as string[],
        tags: JSON.parse(row.tags) as string[],
    };
}

/**
 * @interface TeamRepository
 * @description Team 数据仓库接口
 */
export interface TeamRepository {
    /**
     * @function upsert
     * @description 插入或更新团队记录
     * @param {CreateTeamInput} input - 创建输入
     * @returns {TeamRecord} 团队记录
     */
    upsert(input: CreateTeamInput): TeamRecord;

    /**
     * @function findById
     * @description 根据 ID 查找团队
     * @param {string} id - 团队 ID
     * @returns {TeamRecord | undefined} 团队记录或 undefined
     */
    findById(id: string): TeamRecord | undefined;

    /**
     * @function update
     * @description 更新团队字段
     * @param {UpdateTeamInput} input - 更新输入
     * @returns {TeamRecord | undefined} 更新后的团队记录
     */
    update(input: UpdateTeamInput): TeamRecord | undefined;

    /**
     * @function list
     * @description 列出所有团队
     * @returns {TeamRecord[]} 团队列表
     */
    list(): TeamRecord[];
}

/**
 * @function createTeamRepository
 * @description 创建 Team 数据仓库
 * @param {Database.Database} db - SQLite 连接
 * @returns {TeamRepository} 团队仓库实例
 */
export function createTeamRepository(db: Database.Database): TeamRepository {
    const upsertStmt = db.prepare<[string, string, string, string, string, string, string, string]>(`
        INSERT INTO teams (id, name, description, logo, content, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name        = excluded.name,
            description = excluded.description,
            logo        = excluded.logo,
            content     = excluded.content,
            tags        = excluded.tags,
            updated_at  = excluded.updated_at
    `);

    const findByIdStmt = db.prepare<[string], TeamRow>(`SELECT * FROM teams WHERE id = ?`);

    const updateStmt = db.prepare<[string | undefined, string | undefined, string | undefined, string | undefined, string, string]>(`
        UPDATE teams
        SET description = COALESCE(?, description),
            logo        = COALESCE(?, logo),
            content     = COALESCE(?, content),
            tags        = COALESCE(?, tags),
            updated_at  = ?
        WHERE id = ?
    `);

    const listStmt = db.prepare<[], TeamRow>(`SELECT * FROM teams ORDER BY created_at ASC`);

    return {
        upsert(input: CreateTeamInput): TeamRecord {
            const now = new Date().toISOString();
            upsertStmt.run(
                input.id,
                input.name,
                input.description,
                input.logo,
                input.content,
                JSON.stringify(input.tags ?? []),
                now,
                now,
            );
            const row = findByIdStmt.get(input.id);
            if (!row) throw new Error(`Team upsert failed for id=${input.id}`);
            return toTeamRecord(row);
        },

        findById(id: string): TeamRecord | undefined {
            const row = findByIdStmt.get(id);
            return row ? toTeamRecord(row) : undefined;
        },

        update(input: UpdateTeamInput): TeamRecord | undefined {
            const now = new Date().toISOString();
            updateStmt.run(
                input.description,
                input.logo,
                input.content,
                input.tags != null ? JSON.stringify(input.tags) : undefined,
                now,
                input.id,
            );
            const row = findByIdStmt.get(input.id);
            return row ? toTeamRecord(row) : undefined;
        },

        list(): TeamRecord[] {
            return listStmt.all().map(toTeamRecord);
        },
    };
}
