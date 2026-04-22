/**
 * @packageDocumentation
 * @module db-message-repository
 * @since 1.0.0
 * @author zkali
 * @tags [db, repository, message]
 * @description 对话消息的 SQLite CRUD 操作
 * @path src/db/repositories/message.ts
 */

import type Database from "better-sqlite3";
import type { MessageRow } from "../schema.js";
import type { AgentMessage } from "../../types/index.js";

/**
 * @function toAgentMessage
 * @description 将数据库行转换为 AgentMessage
 * @param {MessageRow} row - 数据库行
 * @returns {AgentMessage} 代理消息
 */
function toAgentMessage(row: MessageRow): AgentMessage {
    const base = {
        id: row.id,
        role: row.role as AgentMessage["role"],
        content: row.content,
    };
    return {
        ...base,
        ...(row.tool_call_id !== null ? { toolCallId: row.tool_call_id } : {}),
        ...(row.msg_name !== null ? { name: row.msg_name } : {}),
    };
}

/**
 * @interface SaveMessageInput
 * @description 保存消息输入
 * @property {string} id - 消息 ID
 * @property {string} agentId - 所属 Agent ID
 * @property {string | undefined} taskId - 关联任务 ID
 * @property {AgentMessage["role"]} role - 消息角色
 * @property {string} content - 消息内容
 * @property {string | undefined} toolCallId - 工具调用 ID
 * @property {string | undefined} name - 发送方名称
 */
export interface SaveMessageInput {
    readonly id: string;
    readonly agentId: string;
    readonly taskId: string | undefined;
    readonly role: AgentMessage["role"];
    readonly content: string;
    readonly toolCallId: string | undefined;
    readonly name: string | undefined;
}

/**
 * @interface MessageRepository
 * @description 消息数据仓库接口
 */
export interface MessageRepository {
    /**
     * @function save
     * @description 保存消息记录
     * @param {SaveMessageInput} input - 消息输入
     * @returns {AgentMessage} 代理消息
     */
    save(input: SaveMessageInput): AgentMessage;

    /**
     * @function listByAgent
     * @description 列出 Agent 的消息历史（最新优先）
     * @param {string} agentId - Agent ID
     * @param {number} [limit=100] - 最大条数
     * @returns {AgentMessage[]} 消息列表
     */
    listByAgent(agentId: string, limit?: number): AgentMessage[];

    /**
     * @function listByTask
     * @description 列出任务的消息历史（按时间升序）
     * @param {string} taskId - 任务 ID
     * @returns {AgentMessage[]} 消息列表
     */
    listByTask(taskId: string): AgentMessage[];
}

/**
 * @function createMessageRepository
 * @description 创建消息数据仓库
 * @param {Database.Database} db - SQLite 连接
 * @returns {MessageRepository} 消息仓库实例
 */
export function createMessageRepository(db: Database.Database): MessageRepository {
    const saveStmt = db.prepare<[string, string, string | null, string, string, string | null, string | null, string]>(`
        INSERT INTO messages (id, agent_id, task_id, role, content, tool_call_id, msg_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const listByAgentStmt = db.prepare<[string, number], MessageRow>(`
        SELECT * FROM messages WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?
    `);

    const listByTaskStmt = db.prepare<[string], MessageRow>(`
        SELECT * FROM messages WHERE task_id = ? ORDER BY created_at ASC
    `);

    return {
        save(input: SaveMessageInput): AgentMessage {
            const now = new Date().toISOString();
            saveStmt.run(
                input.id,
                input.agentId,
                input.taskId ?? null,
                input.role,
                input.content,
                input.toolCallId ?? null,
                input.name ?? null,
                now,
            );
            return {
                id: input.id,
                role: input.role,
                content: input.content,
                ...(input.toolCallId != null ? { toolCallId: input.toolCallId } : {}),
                ...(input.name != null ? { name: input.name } : {}),
            };
        },

        listByAgent(agentId: string, limit = 100): AgentMessage[] {
            return listByAgentStmt.all(agentId, limit).map(toAgentMessage).reverse();
        },

        listByTask(taskId: string): AgentMessage[] {
            return listByTaskStmt.all(taskId).map(toAgentMessage);
        },
    };
}
