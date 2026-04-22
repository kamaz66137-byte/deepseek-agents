/**
 * @packageDocumentation
 * @module db-board-repository
 * @since 1.0.0
 * @author zkali
 * @tags [db, repository, board]
 * @description Board 实体的 SQLite CRUD 操作
 * @path src/db/repositories/board.ts
 */

import type Database from "better-sqlite3";
import type { BoardRow } from "../schema.js";
import type { BoardRecord, CreateBoardInput } from "../../types/index.js";

/**
 * @function toBoardRecord
 * @description 将数据库行转换为 BoardRecord
 * @param {BoardRow} row - 数据库行
 * @returns {BoardRecord} 看板记录
 */
function toBoardRecord(row: BoardRow): BoardRecord {
    const base = {
        id: row.id,
        name: row.name,
        agentId: row.agent_id,
        createdAt: new Date(row.created_at),
    };
    return row.team_id !== null
        ? { ...base, teamId: row.team_id }
        : base;
}

/**
 * @interface BoardRepository
 * @description Board 数据仓库接口
 */
export interface BoardRepository {
    /**
     * @function insert
     * @description 插入看板记录
     * @param {CreateBoardInput} input - 创建输入
     * @param {string} [objective] - 用户原始目标
     * @returns {BoardRecord} 看板记录
     */
    insert(input: CreateBoardInput, objective?: string): BoardRecord;

    /**
     * @function findById
     * @description 根据 ID 查找看板
     * @param {string} id - 看板 ID
     * @returns {BoardRecord | undefined} 看板记录或 undefined
     */
    findById(id: string): BoardRecord | undefined;

    /**
     * @function listByTeam
     * @description 列出团队所有看板
     * @param {string} teamId - 团队 ID
     * @returns {BoardRecord[]} 看板列表
     */
    listByTeam(teamId: string): BoardRecord[];
}

/**
 * @function createBoardRepository
 * @description 创建 Board 数据仓库
 * @param {Database.Database} db - SQLite 连接
 * @returns {BoardRepository} 看板仓库实例
 */
export function createBoardRepository(db: Database.Database): BoardRepository {
    const insertStmt = db.prepare<[string, string, string | null, string, string, string]>(`
        INSERT INTO boards (id, name, team_id, agent_id, objective, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const findByIdStmt = db.prepare<[string], BoardRow>(`SELECT * FROM boards WHERE id = ?`);
    const listByTeamStmt = db.prepare<[string], BoardRow>(`SELECT * FROM boards WHERE team_id = ? ORDER BY created_at DESC`);

    return {
        insert(input: CreateBoardInput, objective = ""): BoardRecord {
            const now = new Date().toISOString();
            insertStmt.run(
                input.id,
                input.name,
                input.teamId ?? null,
                input.agentId,
                objective,
                now,
            );
            const row = findByIdStmt.get(input.id);
            if (!row) throw new Error(`Board insert failed for id=${input.id}`);
            return toBoardRecord(row);
        },

        findById(id: string): BoardRecord | undefined {
            const row = findByIdStmt.get(id);
            return row ? toBoardRecord(row) : undefined;
        },

        listByTeam(teamId: string): BoardRecord[] {
            return listByTeamStmt.all(teamId).map(toBoardRecord);
        },
    };
}
