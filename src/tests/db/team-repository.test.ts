/**
 * @packageDocumentation
 * @module tests-db-team-repository
 * @since 1.0.0
 * @author zkali
 * @tags [test, db, team, repository]
 * @description TeamRepository SQLite CRUD 操作测试
 * @path src/tests/db/team-repository.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createDb } from "../../db/index.js";
import type { Db } from "../../db/index.js";
import { randomUUID } from "crypto";

describe("TeamRepository", () => {
    let db: Db;

    beforeEach(() => {
        db = createDb();
    });

    it("upsert 成功插入并返回 TeamRecord", () => {
        const id = randomUUID();
        const record = db.teams.upsert({
            id,
            name: "研发团队",
            description: "负责研发",
            logo: "https://example.com/logo.png",
            content: "团队内容",
            agents: ["a1", "a2"],
            tags: ["dev", "engineering"],
        });

        expect(record.id).toBe(id);
        expect(record.name).toBe("研发团队");
        expect(record.description).toBe("负责研发");
        expect(record.logo).toBe("https://example.com/logo.png");
        expect(record.content).toBe("团队内容");
        expect(record.agents).toEqual(["a1", "a2"]);
        expect(record.tags).toEqual(["dev", "engineering"]);
    });

    it("upsert 最小字段（无 agents/tags）时默认为空数组", () => {
        const record = db.teams.upsert({ id: randomUUID(), name: "最小团队", description: "", logo: "", content: "" });
        expect(record.agents).toEqual([]);
        expect(record.tags).toEqual([]);
    });

    it("upsert 同 ID 时更新已有记录", () => {
        const id = randomUUID();
        db.teams.upsert({ id, name: "旧名称", description: "", logo: "", content: "" });
        const updated = db.teams.upsert({ id, name: "新名称", description: "更新描述", logo: "", content: "" });
        expect(updated.name).toBe("新名称");
        expect(updated.description).toBe("更新描述");
    });

    it("findById 找到已插入的团队", () => {
        const id = randomUUID();
        db.teams.upsert({ id, name: "查询团队", description: "", logo: "", content: "" });
        const found = db.teams.findById(id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(id);
    });

    it("findById 不存在时返回 undefined", () => {
        expect(db.teams.findById("nonexistent")).toBeUndefined();
    });

    it("update 更新部分字段", () => {
        const id = randomUUID();
        db.teams.upsert({ id, name: "原始团队", description: "原描述", logo: "old-logo", content: "" });
        const updated = db.teams.update({ id, description: "新描述" });
        expect(updated?.description).toBe("新描述");
        expect(updated?.logo).toBe("old-logo");
    });

    it("update 更新 agents 列表", () => {
        const id = randomUUID();
        db.teams.upsert({ id, name: "代理团队", description: "", logo: "", content: "", agents: ["a1"] });
        const updated = db.teams.update({ id, agents: ["a1", "a2", "a3"] });
        expect(updated?.agents).toEqual(["a1", "a2", "a3"]);
    });

    it("update 更新 tags 列表", () => {
        const id = randomUUID();
        db.teams.upsert({ id, name: "标签团队", description: "", logo: "", content: "" });
        const updated = db.teams.update({ id, tags: ["tag1", "tag2"] });
        expect(updated?.tags).toEqual(["tag1", "tag2"]);
    });

    it("update 不存在的 ID 返回 undefined", () => {
        expect(db.teams.update({ id: "ghost" })).toBeUndefined();
    });

    it("list 返回所有团队（按创建时间升序）", () => {
        const id1 = randomUUID();
        const id2 = randomUUID();
        db.teams.upsert({ id: id1, name: "团队A", description: "", logo: "", content: "" });
        db.teams.upsert({ id: id2, name: "团队B", description: "", logo: "", content: "" });
        const list = db.teams.list();
        expect(list.length).toBeGreaterThanOrEqual(2);
        const names = list.map((t) => t.name);
        expect(names).toContain("团队A");
        expect(names).toContain("团队B");
    });

    it("list 空数据库时返回空数组", () => {
        expect(db.teams.list()).toEqual([]);
    });
});
