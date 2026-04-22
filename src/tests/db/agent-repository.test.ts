/**
 * @packageDocumentation
 * @module tests-db-agent-repository
 * @since 1.0.0
 * @author zkali
 * @tags [test, db, agent, repository]
 * @description AgentRepository SQLite CRUD 操作测试
 * @path src/tests/db/agent-repository.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createDb } from "../../db/index.js";
import type { Db } from "../../db/index.js";
import type { AgentRecord } from "../../db/index.js";
import { randomUUID } from "crypto";

/**
 * @description 创建测试用团队 ID
 * @param {Db} db - 数据库实例
 * @returns {string} 团队 ID
 */
function seedTeam(db: Db): string {
    const teamId = randomUUID();
    db.teams.upsert({ id: teamId, name: "测试团队", description: "", logo: "", content: "" });
    return teamId;
}

/**
 * @description 创建测试用 AgentRecord 输入
 * @param {string} teamId - 团队 ID
 * @param {Partial<AgentRecord>} overrides - 覆盖字段
 * @returns {AgentRecord} 代理记录
 */
function makeAgent(teamId: string, overrides: Partial<AgentRecord> = {}): AgentRecord {
    return {
        id: randomUUID(),
        teamId,
        name: "测试代理",
        alias: "test-agent",
        description: "代理描述",
        role: "implement",
        deepseekModel: "deepseek-chat",
        temperature: undefined,
        prompt: "你是一个代理",
        toolBundle: "default-tools",
        skillBundle: "default-skills",
        ...overrides,
    };
}

describe("AgentRepository", () => {
    let db: Db;
    let teamId: string;

    beforeEach(() => {
        db = createDb();
        teamId = seedTeam(db);
    });

    it("upsert 成功插入并返回 AgentRecord", () => {
        const input = makeAgent(teamId);
        const record = db.agents.upsert(input);

        expect(record.id).toBe(input.id);
        expect(record.name).toBe("测试代理");
        expect(record.alias).toBe("test-agent");
        expect(record.teamId).toBe(teamId);
        expect(record.role).toBe("implement");
        expect(record.deepseekModel).toBe("deepseek-chat");
        expect(record.temperature).toBeUndefined();
    });

    it("upsert 带 temperature 时正确保存", () => {
        const input = makeAgent(teamId, { temperature: 0.7 });
        const record = db.agents.upsert(input);
        expect(record.temperature).toBe(0.7);
    });

    it("upsert 同 ID 时更新已有记录", () => {
        const id = randomUUID();
        db.agents.upsert(makeAgent(teamId, { id, name: "旧名称" }));
        const updated = db.agents.upsert(makeAgent(teamId, { id, name: "新名称" }));
        expect(updated.name).toBe("新名称");
    });

    it("findById 找到已插入的代理", () => {
        const input = makeAgent(teamId);
        db.agents.upsert(input);
        const found = db.agents.findById(input.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(input.id);
    });

    it("findById 不存在时返回 undefined", () => {
        expect(db.agents.findById("ghost")).toBeUndefined();
    });

    it("findByAlias 根据 alias 和 teamId 查找代理", () => {
        const input = makeAgent(teamId, { alias: "unique-alias" });
        db.agents.upsert(input);
        const found = db.agents.findByAlias("unique-alias", teamId);
        expect(found).toBeDefined();
        expect(found?.alias).toBe("unique-alias");
    });

    it("findByAlias 不存在时返回 undefined", () => {
        expect(db.agents.findByAlias("nobody", teamId)).toBeUndefined();
    });

    it("findByAlias 不同团队的相同 alias 不混淆", () => {
        const teamId2 = randomUUID();
        db.teams.upsert({ id: teamId2, name: "另一团队", description: "", logo: "", content: "" });

        db.agents.upsert(makeAgent(teamId, { alias: "shared-alias", name: "代理A" }));
        db.agents.upsert(makeAgent(teamId2, { alias: "shared-alias", name: "代理B" }));

        const found = db.agents.findByAlias("shared-alias", teamId);
        expect(found?.name).toBe("代理A");
    });

    it("listByTeam 返回团队内所有代理", () => {
        db.agents.upsert(makeAgent(teamId, { alias: "a1" }));
        db.agents.upsert(makeAgent(teamId, { alias: "a2" }));
        const list = db.agents.listByTeam(teamId);
        expect(list).toHaveLength(2);
        expect(list.every((a) => a.teamId === teamId)).toBe(true);
    });

    it("listByTeam 空团队返回空数组", () => {
        const emptyTeamId = randomUUID();
        db.teams.upsert({ id: emptyTeamId, name: "空团队", description: "", logo: "", content: "" });
        expect(db.agents.listByTeam(emptyTeamId)).toEqual([]);
    });

    it("listByRole 按角色过滤", () => {
        db.agents.upsert(makeAgent(teamId, { alias: "planner", role: "plan" }));
        db.agents.upsert(makeAgent(teamId, { alias: "worker", role: "implement" }));
        db.agents.upsert(makeAgent(teamId, { alias: "reviewer", role: "review" }));

        const planners = db.agents.listByRole(teamId, "plan");
        expect(planners).toHaveLength(1);
        expect(planners[0]?.alias).toBe("planner");

        const workers = db.agents.listByRole(teamId, "implement");
        expect(workers).toHaveLength(1);
        expect(workers[0]?.alias).toBe("worker");
    });

    it("listByRole 无匹配角色时返回空数组", () => {
        db.agents.upsert(makeAgent(teamId, { alias: "worker", role: "implement" }));
        expect(db.agents.listByRole(teamId, "acceptance")).toEqual([]);
    });

    it("listByTeam 按名称字母排序", () => {
        db.agents.upsert(makeAgent(teamId, { alias: "z-agent", name: "beta" }));
        db.agents.upsert(makeAgent(teamId, { alias: "a-agent", name: "alpha" }));
        const list = db.agents.listByTeam(teamId);
        expect(list[0]?.name).toBe("alpha");
        expect(list[1]?.name).toBe("beta");
    });
});
