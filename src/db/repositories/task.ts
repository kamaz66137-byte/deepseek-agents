/**
 * @packageDocumentation
 * @module db-task-repository
 * @since 1.0.0
 * @author zkali
 * @tags [db, repository, task]
 * @description Task 实体的 SQLite CRUD 操作
 * @path src/db/repositories/task.ts
 */

import type Database from "better-sqlite3";
import type { TaskRow } from "../schema.js";
import { TaskStatus } from "../../types/index.js";
import type { Task, CreateTaskInput, UpdateTaskInput } from "../../types/index.js";

/**
 * @function toTask
 * @description 将数据库行转换为 Task 运行时对象
 * @param {TaskRow} row - 数据库行
 * @returns {Task} 任务记录
 */
function toTask(row: TaskRow): Task {
    return {
        id: row.id,
        boardId: row.board_id,
        title: row.title,
        ...(row.description ? { description: row.description } : {}),
        status: row.status as Task["status"],
        ...(row.assignee_id !== null ? { assigneeId: row.assignee_id } : {}),
        ...(row.team_id !== null ? { teamId: row.team_id } : {}),
        dependsOn: JSON.parse(row.depends_on) as string[],
        ...(row.content !== null ? { content: row.content } : {}),
        priority: row.priority ?? 0,
        ...(row.timeout != null ? { timeout: row.timeout } : {}),
        retryLimit: row.retry_limit ?? 0,
        retryCount: row.retry_count ?? 0,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * @interface TaskRepository
 * @description Task 数据仓库接口
 */
export interface TaskRepository {
    /**
     * @function insert
     * @description 插入任务记录
     * @param {CreateTaskInput} input - 创建输入
     * @returns {Task} 任务记录
     */
    insert(input: CreateTaskInput): Task;

    /**
     * @function findById
     * @description 根据 ID 查找任务
     * @param {string} id - 任务 ID
     * @returns {Task | undefined} 任务记录或 undefined
     */
    findById(id: string): Task | undefined;

    /**
     * @function listByBoard
     * @description 列出看板所有任务
     * @param {string} boardId - 看板 ID
     * @returns {Task[]} 任务列表
     */
    listByBoard(boardId: string): Task[];

    /**
     * @function update
     * @description 更新任务字段
     * @param {UpdateTaskInput} input - 更新输入
     * @returns {Task | undefined} 更新后的任务记录
     */
    update(input: UpdateTaskInput): Task | undefined;

    /**
     * @function casStatus
     * @description 乐观锁更新任务状态（仅当当前状态匹配时才更新）
     * @param {string} id - 任务 ID
     * @param {Task["status"]} expectedStatus - 期望的当前状态
     * @param {Task["status"]} newStatus - 新状态
     * @returns {boolean} 是否更新成功
     */
    casStatus(id: string, expectedStatus: Task["status"], newStatus: Task["status"]): boolean;

    /**
     * @function incrementRetryCount
     * @description 将任务状态重置为 pending 并递增重试计数（用于自动重试）
     * @param {string} id - 任务 ID
     * @returns {boolean} 是否更新成功
     */
    incrementRetryCount(id: string): boolean;
}

/**
 * @function createTaskRepository
 * @description 创建 Task 数据仓库
 * @param {Database.Database} db - SQLite 连接
 * @returns {TaskRepository} 任务仓库实例
 */
export function createTaskRepository(db: Database.Database): TaskRepository {
    const insertStmt = db.prepare<[string, string, string, string, string, string | null, string | null, string, string | null, number, number | null, number, string, string]>(`
        INSERT INTO tasks (id, board_id, title, description, status, assignee_id, team_id, depends_on, content, priority, timeout, retry_limit, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const findByIdStmt = db.prepare<[string], TaskRow>(`SELECT * FROM tasks WHERE id = ?`);
    const listByBoardStmt = db.prepare<[string], TaskRow>(`SELECT * FROM tasks WHERE board_id = ? ORDER BY priority DESC, created_at ASC`);

    const updateStmt = db.prepare<[string | undefined, string | undefined, string | undefined, string | undefined, string | undefined, number | undefined, string, string]>(`
        UPDATE tasks
        SET status      = COALESCE(?, status),
            assignee_id = COALESCE(?, assignee_id),
            description = COALESCE(?, description),
            depends_on  = COALESCE(?, depends_on),
            content     = COALESCE(?, content),
            retry_count = COALESCE(?, retry_count),
            updated_at  = ?
        WHERE id = ?
    `);

    const casStmt = db.prepare<[string, string, string, string]>(`
        UPDATE tasks SET status = ?, updated_at = ? WHERE id = ? AND status = ?
    `);

    const retryStmt = db.prepare<[string, string]>(`
        UPDATE tasks
        SET status = 'pending',
            retry_count = retry_count + 1,
            content = NULL,
            updated_at = ?
        WHERE id = ?
    `);

    return {
        insert(input: CreateTaskInput): Task {
            const now = new Date().toISOString();
            insertStmt.run(
                input.id,
                input.boardId,
                input.title,
                input.description ?? "",
                TaskStatus.PENDING,
                input.assigneeId ?? null,
                input.teamId ?? null,
                JSON.stringify(input.dependsOn ?? []),
                input.content ?? null,
                input.priority ?? 0,
                input.timeout ?? null,
                input.retryLimit ?? 0,
                now,
                now,
            );
            const row = findByIdStmt.get(input.id);
            if (!row) throw new Error(`Task insert failed for id=${input.id}`);
            return toTask(row);
        },

        findById(id: string): Task | undefined {
            const row = findByIdStmt.get(id);
            return row ? toTask(row) : undefined;
        },

        listByBoard(boardId: string): Task[] {
            return listByBoardStmt.all(boardId).map(toTask);
        },

        update(input: UpdateTaskInput): Task | undefined {
            const now = new Date().toISOString();
            updateStmt.run(
                input.status,
                input.assigneeId,
                input.description,
                input.dependsOn != null ? JSON.stringify(input.dependsOn) : undefined,
                input.content,
                input.retryCount,
                now,
                input.id,
            );
            const row = findByIdStmt.get(input.id);
            return row ? toTask(row) : undefined;
        },

        casStatus(id: string, expectedStatus: Task["status"], newStatus: Task["status"]): boolean {
            const result = casStmt.run(newStatus, new Date().toISOString(), id, expectedStatus);
            return result.changes > 0;
        },

        incrementRetryCount(id: string): boolean {
            const result = retryStmt.run(new Date().toISOString(), id);
            return result.changes > 0;
        },
    };
}
