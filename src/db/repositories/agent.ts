/**
 * @packageDocumentation
 * @module db-agent-repository
 * @since 1.0.0
 * @author zkali
 * @tags [db, repository, agent]
 * @description Agent 实体的 SQLite CRUD 操作
 * @path src/db/repositories/agent.ts
 */

import type Database from "better-sqlite3";
import type { AgentRow } from "../schema.js";
import type { TeamRoleType } from "../../contract/constant/index.js";

/**
 * @interface AgentRecord
 * @description Agent 运行时记录（扁平化，适合 DB 存储）
 * @property {string} id - Agent ID
 * @property {string} teamId - 归属团队 ID
 * @property {string} name - 名称
 * @property {string} alias - 别名
 * @property {string} description - 描述
 * @property {TeamRoleType} role - 团队角色
 * @property {string} deepseekModel - 绑定模型
 * @property {number | undefined} temperature - 采样温度
 * @property {string} prompt - 系统提示词
 * @property {string} toolBundle - 工具包名称
 * @property {string} skillBundle - 技能包名称
 */
export interface AgentRecord {
    readonly id: string;
    readonly teamId: string;
    readonly name: string;
    readonly alias: string;
    readonly description: string;
    readonly role: TeamRoleType;
    readonly deepseekModel: string;
    readonly temperature: number | undefined;
    readonly prompt: string;
    readonly toolBundle: string;
    readonly skillBundle: string;
}

/**
 * @interface CreateAgentRecord
 * @description 创建 Agent 记录输入
 */
export type CreateAgentRecord = Omit<AgentRecord, never>;

/**
 * @function toAgentRecord
 * @description 将数据库行转换为 AgentRecord
 * @param {AgentRow} row - 数据库行
 * @returns {AgentRecord} Agent 记录
 */
function toAgentRecord(row: AgentRow): AgentRecord {
    return {
        id: row.id,
        teamId: row.team_id,
        name: row.name,
        alias: row.alias,
        description: row.description,
        role: row.role as TeamRoleType,
        deepseekModel: row.deepseek_model,
        temperature: row.temperature ?? undefined,
        prompt: row.prompt,
        toolBundle: row.tool_bundle,
        skillBundle: row.skill_bundle,
    };
}

/**
 * @interface AgentRepository
 * @description Agent 数据仓库接口
 */
export interface AgentRepository {
    /**
     * @function upsert
     * @description 插入或更新 Agent 记录
     * @param {CreateAgentRecord} input - 输入
     * @returns {AgentRecord} Agent 记录
     */
    upsert(input: CreateAgentRecord): AgentRecord;

    /**
     * @function findById
     * @description 根据 ID 查找 Agent
     * @param {string} id - Agent ID
     * @returns {AgentRecord | undefined} Agent 记录或 undefined
     */
    findById(id: string): AgentRecord | undefined;

    /**
     * @function findByAlias
     * @description 根据 alias 和 teamId 查找 Agent
     * @param {string} alias - 别名
     * @param {string} teamId - 团队 ID
     * @returns {AgentRecord | undefined} Agent 记录或 undefined
     */
    findByAlias(alias: string, teamId: string): AgentRecord | undefined;

    /**
     * @function listByTeam
     * @description 列出团队下所有 Agent
     * @param {string} teamId - 团队 ID
     * @returns {AgentRecord[]} Agent 列表
     */
    listByTeam(teamId: string): AgentRecord[];

    /**
     * @function listByRole
     * @description 列出团队下指定角色的 Agent
     * @param {string} teamId - 团队 ID
     * @param {TeamRoleType} role - 角色
     * @returns {AgentRecord[]} Agent 列表
     */
    listByRole(teamId: string, role: TeamRoleType): AgentRecord[];
}

/**
 * @function createAgentRepository
 * @description 创建 Agent 数据仓库
 * @param {Database.Database} db - SQLite 连接
 * @returns {AgentRepository} Agent 仓库实例
 */
export function createAgentRepository(db: Database.Database): AgentRepository {
    const upsertStmt = db.prepare<[string, string, string, string, string, string, string, number | null, string, string, string, string, string]>(`
        INSERT INTO agents (id, team_id, name, alias, description, role, deepseek_model, temperature, prompt, tool_bundle, skill_bundle, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            team_id        = excluded.team_id,
            name           = excluded.name,
            alias          = excluded.alias,
            description    = excluded.description,
            role           = excluded.role,
            deepseek_model = excluded.deepseek_model,
            temperature    = excluded.temperature,
            prompt         = excluded.prompt,
            tool_bundle    = excluded.tool_bundle,
            skill_bundle   = excluded.skill_bundle,
            updated_at     = excluded.updated_at
    `);

    const findByIdStmt = db.prepare<[string], AgentRow>(`SELECT * FROM agents WHERE id = ?`);
    const findByAliasStmt = db.prepare<[string, string], AgentRow>(`SELECT * FROM agents WHERE alias = ? AND team_id = ?`);
    const listByTeamStmt = db.prepare<[string], AgentRow>(`SELECT * FROM agents WHERE team_id = ? ORDER BY name ASC`);
    const listByRoleStmt = db.prepare<[string, string], AgentRow>(`SELECT * FROM agents WHERE team_id = ? AND role = ? ORDER BY name ASC`);

    return {
        upsert(input: CreateAgentRecord): AgentRecord {
            const now = new Date().toISOString();
            upsertStmt.run(
                input.id,
                input.teamId,
                input.name,
                input.alias,
                input.description,
                input.role,
                input.deepseekModel,
                input.temperature ?? null,
                input.prompt,
                input.toolBundle,
                input.skillBundle,
                now,
                now,
            );
            const row = findByIdStmt.get(input.id);
            if (!row) throw new Error(`Agent upsert failed for id=${input.id}`);
            return toAgentRecord(row);
        },

        findById(id: string): AgentRecord | undefined {
            const row = findByIdStmt.get(id);
            return row ? toAgentRecord(row) : undefined;
        },

        findByAlias(alias: string, teamId: string): AgentRecord | undefined {
            const row = findByAliasStmt.get(alias, teamId);
            return row ? toAgentRecord(row) : undefined;
        },

        listByTeam(teamId: string): AgentRecord[] {
            return listByTeamStmt.all(teamId).map(toAgentRecord);
        },

        listByRole(teamId: string, role: TeamRoleType): AgentRecord[] {
            return listByRoleStmt.all(teamId, role).map(toAgentRecord);
        },
    };
}
