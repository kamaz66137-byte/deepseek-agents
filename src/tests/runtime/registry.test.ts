/**
 * @packageDocumentation
 * @module tests-runtime-registry
 * @since 1.0.0
 * @author zkali
 * @tags [test, runtime, registry, tool, skill]
 * @description ToolRegistry 与 SkillRegistry 注册表功能测试
 * @path src/tests/runtime/registry.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolRegistry, SkillRegistry } from "../../runtime/registry.js";
import type { ToolDefinition, SkillDefinition } from "../../types/index.js";
import type { ToolBundleRepository, SkillBundleRepository } from "../../db/index.js";

/**
 * @description 创建测试用工具定义
 * @param {string} name - 工具名称
 * @returns {ToolDefinition} 工具定义
 */
function makeToolDef(name: string): ToolDefinition {
    return {
        id: `tool-${name}`,
        name,
        description: `${name} 工具描述`,
        parameters: {
            input: { id: "p1", type: "string", description: "输入参数" },
        },
        required: ["input"],
        execute: vi.fn().mockResolvedValue({ result: `${name} 结果` }),
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
        description: `${name} 技能描述`,
        content: `${name} 内容`,
        execute: vi.fn().mockResolvedValue({ result: `${name} 技能结果` }),
    };
}

describe("ToolRegistry", () => {
    let registry: ToolRegistry;

    beforeEach(() => {
        registry = new ToolRegistry();
    });

    it("register 注册后 getBundle 返回工具列表", () => {
        const tools = [makeToolDef("search"), makeToolDef("write")];
        registry.register("bundle-a", tools);
        expect(registry.getBundle("bundle-a")).toEqual(tools);
    });

    it("getBundle 不存在的包返回空数组", () => {
        expect(registry.getBundle("not-exist")).toEqual([]);
    });

    it("register 支持链式调用", () => {
        const result = registry.register("a", []).register("b", []);
        expect(result).toBe(registry);
    });

    it("listBundleNames 返回所有已注册包名", () => {
        registry.register("alpha", []);
        registry.register("beta", []);
        const names = registry.listBundleNames();
        expect(names).toContain("alpha");
        expect(names).toContain("beta");
        expect(names).toHaveLength(2);
    });

    it("listBundleNames 初始为空数组", () => {
        expect(registry.listBundleNames()).toEqual([]);
    });

    it("unregister 已存在的包返回 true 并移除", () => {
        registry.register("to-remove", [makeToolDef("x")]);
        expect(registry.unregister("to-remove")).toBe(true);
        expect(registry.getBundle("to-remove")).toEqual([]);
    });

    it("unregister 不存在的包返回 false", () => {
        expect(registry.unregister("ghost")).toBe(false);
    });

    it("findTool 按名称找到工具", () => {
        const tool = makeToolDef("calculator");
        registry.register("math", [tool]);
        expect(registry.findTool("math", "calculator")).toEqual(tool);
    });

    it("findTool 工具不存在时返回 undefined", () => {
        registry.register("math", [makeToolDef("calculator")]);
        expect(registry.findTool("math", "nonexistent")).toBeUndefined();
    });

    it("findTool 包不存在时返回 undefined", () => {
        expect(registry.findTool("ghost-bundle", "tool")).toBeUndefined();
    });

    it("toFunctionTools 正确转换为 FunctionTool 格式", () => {
        const tool = makeToolDef("search");
        registry.register("bundle", [tool]);
        const fnTools = registry.toFunctionTools("bundle");
        expect(fnTools).toHaveLength(1);
        expect(fnTools[0]).toMatchObject({
            type: "function",
            function: {
                name: "search",
                description: "search 工具描述",
                parameters: {
                    type: "object",
                    properties: {
                        input: { type: "string", description: "输入参数" },
                    },
                    required: ["input"],
                },
            },
        });
    });

    it("toFunctionTools 无 required 时不添加 required 字段", () => {
        const tool: ToolDefinition = {
            id: "t1",
            name: "optional-tool",
            description: "描述",
            parameters: { x: { id: "p1", type: "number", description: "数字" } },
            execute: vi.fn(),
        };
        registry.register("bundle", [tool]);
        const fnTools = registry.toFunctionTools("bundle");
        expect(fnTools[0]?.function.parameters.required).toBeUndefined();
    });

    it("toFunctionTools 包不存在时返回空数组", () => {
        expect(registry.toFunctionTools("nonexistent")).toEqual([]);
    });

    it("persistToDb 调用 repo.save 保存所有包", () => {
        const tool = makeToolDef("persist-tool");
        registry.register("bundle-x", [tool]);
        const mockRepo = { save: vi.fn(), findByName: vi.fn(), listAll: vi.fn(), remove: vi.fn() } as unknown as ToolBundleRepository;
        registry.persistToDb(mockRepo);
        expect(mockRepo.save).toHaveBeenCalledWith("bundle-x", [tool]);
    });

    it("loadFromDb 从仓库加载工具包", () => {
        const mockRepo = {
            listAll: vi.fn().mockReturnValue([
                {
                    id: "rec1",
                    bundleName: "loaded-bundle",
                    tools: [
                        {
                            id: "t1",
                            name: "loaded-tool",
                            description: "描述",
                            parameters: { q: { id: "p1", type: "string", description: "查询" } },
                            required: ["q"],
                        },
                    ],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]),
        } as unknown as ToolBundleRepository;

        registry.loadFromDb(mockRepo);
        const tools = registry.getBundle("loaded-bundle");
        expect(tools).toHaveLength(1);
        expect(tools[0]?.name).toBe("loaded-tool");
    });

    it("loadFromDb 使用 execMap 绑定执行函数", async () => {
        const execFn = vi.fn().mockResolvedValue("ok");
        const mockRepo = {
            listAll: vi.fn().mockReturnValue([
                {
                    id: "rec1",
                    bundleName: "exec-bundle",
                    tools: [{ id: "t1", name: "exec-tool", description: "描述", parameters: {} }],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]),
        } as unknown as ToolBundleRepository;

        registry.loadFromDb(mockRepo, { "exec-tool": execFn });
        const tool = registry.findTool("exec-bundle", "exec-tool");
        expect(tool).toBeDefined();
        const result = await tool!.execute({});
        expect(execFn).toHaveBeenCalledWith({});
        expect(result).toBe("ok");
    });
});

describe("SkillRegistry", () => {
    let registry: SkillRegistry;

    beforeEach(() => {
        registry = new SkillRegistry();
    });

    it("register 注册后 getBundle 返回技能列表", () => {
        const skills = [makeSkillDef("code"), makeSkillDef("review")];
        registry.register("dev-skills", skills);
        expect(registry.getBundle("dev-skills")).toEqual(skills);
    });

    it("getBundle 不存在的包返回空数组", () => {
        expect(registry.getBundle("empty")).toEqual([]);
    });

    it("register 支持链式调用", () => {
        const result = registry.register("a", []).register("b", []);
        expect(result).toBe(registry);
    });

    it("listBundleNames 返回所有已注册包名", () => {
        registry.register("s1", []);
        registry.register("s2", []);
        const names = registry.listBundleNames();
        expect(names).toContain("s1");
        expect(names).toContain("s2");
    });

    it("unregister 已存在的包返回 true", () => {
        registry.register("to-del", []);
        expect(registry.unregister("to-del")).toBe(true);
        expect(registry.getBundle("to-del")).toEqual([]);
    });

    it("unregister 不存在的包返回 false", () => {
        expect(registry.unregister("nope")).toBe(false);
    });

    it("findSkill 按名称找到技能", () => {
        const skill = makeSkillDef("analyze");
        registry.register("analytics", [skill]);
        expect(registry.findSkill("analytics", "analyze")).toEqual(skill);
    });

    it("findSkill 技能不存在时返回 undefined", () => {
        registry.register("analytics", [makeSkillDef("analyze")]);
        expect(registry.findSkill("analytics", "nonexistent")).toBeUndefined();
    });

    it("persistToDb 调用 repo.save 保存所有技能包", () => {
        const skill = makeSkillDef("skill-x");
        registry.register("skill-bundle", [skill]);
        const mockRepo = { save: vi.fn(), findByName: vi.fn(), listAll: vi.fn(), remove: vi.fn() } as unknown as SkillBundleRepository;
        registry.persistToDb(mockRepo);
        expect(mockRepo.save).toHaveBeenCalledWith("skill-bundle", [skill]);
    });

    it("loadFromDb 从仓库加载技能包", () => {
        const mockRepo = {
            listAll: vi.fn().mockReturnValue([
                {
                    id: "rec1",
                    bundleName: "loaded-skills",
                    skills: [
                        { id: "s1", name: "loaded-skill", description: "描述", content: "内容" },
                    ],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]),
        } as unknown as SkillBundleRepository;

        registry.loadFromDb(mockRepo);
        const skills = registry.getBundle("loaded-skills");
        expect(skills).toHaveLength(1);
        expect(skills[0]?.name).toBe("loaded-skill");
        expect(skills[0]?.content).toBe("内容");
    });
});
