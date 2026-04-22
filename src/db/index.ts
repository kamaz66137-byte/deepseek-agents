/**
 * @packageDocumentation
 * @module db-index
 * @since 1.0.0
 * @author zkali
 * @tags [db, sqlite, index]
 * @description 数据库模块统一导出入口，包含 Db 聚合类
 * @path src/db/index.ts
 */

import type Database from "better-sqlite3";
import { createDbClient } from "./client.js";
import { createTeamRepository } from "./repositories/team.js";
import { createAgentRepository } from "./repositories/agent.js";
import { createBoardRepository } from "./repositories/board.js";
import { createTaskRepository } from "./repositories/task.js";
import { createMemoryRepository } from "./repositories/memory.js";
import { createMessageRepository } from "./repositories/message.js";
import { createToolBundleRepository, createSkillBundleRepository } from "./repositories/tool.js";
import type { TeamRepository } from "./repositories/team.js";
import type { AgentRepository } from "./repositories/agent.js";
import type { BoardRepository } from "./repositories/board.js";
import type { TaskRepository } from "./repositories/task.js";
import type { MemoryRepository } from "./repositories/memory.js";
import type { MessageRepository } from "./repositories/message.js";
import type { ToolBundleRepository, SkillBundleRepository } from "./repositories/tool.js";

export type { TeamRepository, AgentRepository, BoardRepository, TaskRepository, MemoryRepository, MessageRepository };
export type { ToolBundleRepository, SkillBundleRepository };
export type { ToolBundleRecord, SkillBundleRecord, PersistedToolDefinition, PersistedSkillDefinition } from "./repositories/tool.js";
export type { AgentRecord, CreateAgentRecord } from "./repositories/agent.js";
export type { SaveMessageInput } from "./repositories/message.js";

/**
 * @interface Db
 * @description 聚合所有数据仓库的数据库访问对象
 * @property {TeamRepository} teams - 团队仓库
 * @property {AgentRepository} agents - 代理仓库
 * @property {BoardRepository} boards - 看板仓库
 * @property {TaskRepository} tasks - 任务仓库
 * @property {MemoryRepository} memories - 记忆仓库
 * @property {MessageRepository} messages - 消息仓库
 * @property {ToolBundleRepository} toolBundles - 工具包持久化仓库
 * @property {SkillBundleRepository} skillBundles - 技能包持久化仓库
 * @property {Database.Database} raw - 原始 SQLite 连接（供事务使用）
 */
export interface Db {
    readonly teams: TeamRepository;
    readonly agents: AgentRepository;
    readonly boards: BoardRepository;
    readonly tasks: TaskRepository;
    readonly memories: MemoryRepository;
    readonly messages: MessageRepository;
    readonly toolBundles: ToolBundleRepository;
    readonly skillBundles: SkillBundleRepository;
    readonly raw: Database.Database;
}

/**
 * @function createDb
 * @description 创建并初始化数据库访问对象
 * @param {string} [dbPath=":memory:"] - 数据库文件路径，默认内存数据库
 * @returns {Db} 数据库访问对象
 */
export function createDb(dbPath?: string): Db {
    const raw = createDbClient(dbPath);
    return {
        teams: createTeamRepository(raw),
        agents: createAgentRepository(raw),
        boards: createBoardRepository(raw),
        tasks: createTaskRepository(raw),
        memories: createMemoryRepository(raw),
        messages: createMessageRepository(raw),
        toolBundles: createToolBundleRepository(raw),
        skillBundles: createSkillBundleRepository(raw),
        raw,
    };
}
