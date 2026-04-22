/**
 * @packageDocumentation
 * @module tests-db-tool-repository
 * @since 1.0.0
 * @author zkali
 * @tags [test, db, tool, skill, repository]
 * @description ToolBundleRepository 和 SkillBundleRepository SQLite 持久化测试
 * @path src/tests/db/tool-repository.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDb } from "../../db/index.js";
import type { Db } from "../../db/index.js";
import type { ToolDefinition, SkillDefinition } from "../../types/index.js";

/**
 * @description 创建测试用工具定义
 * @param {string} name - 工具名称
 * @returns {ToolDefinition} 工具定义
 */
function makeToolDef(name: string): ToolDefinition {
    return {
        id: `tool-${name}`,
        name,
        description: `${name} 工具`,
        parameters: {
            query: { id: "p1", type: "string", description: "查询参数" },
        },
        required: ["query"],
        execute: vi.fn().mockResolvedValue("结果"),
    };
}

/**
 * @description 创建测试用技能定义
 * @param {string} name - 技能名称
 * @returns {SkillDefinition} 技能定义
 */
function makeSkillDef(name: string): SkillDefinition {
    return {
        id: `skill-${name}`,
        name,
        description: `${name} 技能`,
        content: `${name} 提示词内容`,
        execute: vi.fn().mockResolvedValue("技能结果"),
    };
}

describe("ToolBundleRepository", () => {
    let db: Db;

    beforeEach(() => {
        db = createDb();
    });

    it("save 成功保存工具包并返回记录", () => {
        const tools = [makeToolDef("search"), makeToolDef("write")];
        const record = db.toolBundles.save("dev-tools", tools);

        expect(record.bundleName).toBe("dev-tools");
        expect(record.tools).toHaveLength(2);
        expect(record.tools[0]?.name).toBe("search");
        expect(record.tools[1]?.name).toBe("write");
        expect(record.createdAt).toBeInstanceOf(Date);
        expect(record.updatedAt).toBeInstanceOf(Date);
    });

    it("save 剔除 execute 函数（仅序列化元数据）", () => {
        const tool = makeToolDef("exec-tool");
        const record = db.toolBundles.save("exec-bundle", [tool]);
        const persisted = record.tools[0];
        expect(persisted).toBeDefined();
        expect("execute" in persisted!).toBe(false);
    });

    it("save 相同 bundleName 时覆盖更新", () => {
        db.toolBundles.save("bundle-x", [makeToolDef("old-tool")]);
        const updated = db.toolBundles.save("bundle-x", [makeToolDef("new-tool"), makeToolDef("extra-tool")]);
        expect(updated.tools).toHaveLength(2);
        expect(updated.tools[0]?.name).toBe("new-tool");
    });

    it("findByName 找到已保存的工具包", () => {
        db.toolBundles.save("find-bundle", [makeToolDef("finder")]);
        const found = db.toolBundles.findByName("find-bundle");
        expect(found).toBeDefined();
        expect(found?.bundleName).toBe("find-bundle");
    });

    it("findByName 不存在时返回 undefined", () => {
        expect(db.toolBundles.findByName("ghost-bundle")).toBeUndefined();
    });

    it("listAll 返回所有工具包（按名称升序）", () => {
        db.toolBundles.save("zebra-tools", [makeToolDef("z")]);
        db.toolBundles.save("alpha-tools", [makeToolDef("a")]);
        const list = db.toolBundles.listAll();
        expect(list).toHaveLength(2);
        expect(list[0]?.bundleName).toBe("alpha-tools");
        expect(list[1]?.bundleName).toBe("zebra-tools");
    });

    it("listAll 空数据库时返回空数组", () => {
        expect(db.toolBundles.listAll()).toEqual([]);
    });

    it("remove 删除存在的工具包返回 true", () => {
        db.toolBundles.save("del-bundle", [makeToolDef("x")]);
        expect(db.toolBundles.remove("del-bundle")).toBe(true);
        expect(db.toolBundles.findByName("del-bundle")).toBeUndefined();
    });

    it("remove 不存在的工具包返回 false", () => {
        expect(db.toolBundles.remove("nonexistent")).toBe(false);
    });

    it("save 保留 required 字段", () => {
        const tool: ToolDefinition = {
            id: "t1",
            name: "req-tool",
            description: "带必填参数工具",
            parameters: {
                a: { id: "p1", type: "string", description: "A" },
                b: { id: "p2", type: "number", description: "B" },
            },
            required: ["a", "b"],
            execute: vi.fn(),
        };
        const record = db.toolBundles.save("req-bundle", [tool]);
        expect(record.tools[0]?.required).toEqual(["a", "b"]);
    });
});

describe("SkillBundleRepository", () => {
    let db: Db;

    beforeEach(() => {
        db = createDb();
    });

    it("save 成功保存技能包并返回记录", () => {
        const skills = [makeSkillDef("analyze"), makeSkillDef("summarize")];
        const record = db.skillBundles.save("analytics-skills", skills);

        expect(record.bundleName).toBe("analytics-skills");
        expect(record.skills).toHaveLength(2);
        expect(record.skills[0]?.name).toBe("analyze");
        expect(record.createdAt).toBeInstanceOf(Date);
    });

    it("save 剔除 execute 函数（仅序列化元数据）", () => {
        const skill = makeSkillDef("exec-skill");
        const record = db.skillBundles.save("exec-skill-bundle", [skill]);
        expect("execute" in (record.skills[0] ?? {})).toBe(false);
    });

    it("save 相同 bundleName 时覆盖更新", () => {
        db.skillBundles.save("skill-x", [makeSkillDef("old")]);
        const updated = db.skillBundles.save("skill-x", [makeSkillDef("new1"), makeSkillDef("new2")]);
        expect(updated.skills).toHaveLength(2);
    });

    it("findByName 找到已保存的技能包", () => {
        db.skillBundles.save("find-skill", [makeSkillDef("s1")]);
        const found = db.skillBundles.findByName("find-skill");
        expect(found).toBeDefined();
        expect(found?.bundleName).toBe("find-skill");
    });

    it("findByName 不存在时返回 undefined", () => {
        expect(db.skillBundles.findByName("ghost")).toBeUndefined();
    });

    it("listAll 返回所有技能包", () => {
        db.skillBundles.save("sk-b", [makeSkillDef("b")]);
        db.skillBundles.save("sk-a", [makeSkillDef("a")]);
        const list = db.skillBundles.listAll();
        expect(list).toHaveLength(2);
        expect(list[0]?.bundleName).toBe("sk-a");
    });

    it("remove 删除存在的技能包返回 true", () => {
        db.skillBundles.save("del-skill", [makeSkillDef("d")]);
        expect(db.skillBundles.remove("del-skill")).toBe(true);
        expect(db.skillBundles.findByName("del-skill")).toBeUndefined();
    });

    it("remove 不存在时返回 false", () => {
        expect(db.skillBundles.remove("nope")).toBe(false);
    });

    it("save 无 content 的技能正确处理", () => {
        const skill: SkillDefinition = {
            id: "s-no-content",
            name: "no-content-skill",
            description: "无内容技能",
            execute: vi.fn(),
        };
        const record = db.skillBundles.save("no-content-bundle", [skill]);
        const saved = record.skills[0];
        expect(saved?.name).toBe("no-content-skill");
        expect(saved?.content).toBeUndefined();
    });
});
