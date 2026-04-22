/**
 * @packageDocumentation
 * @module tests-contract-contract
 * @since 1.0.0
 * @author zkali
 * @tags [test, contract, constants]
 * @description 契约常量模块测试：CONTRACTS、TeamRole、TaskStatus、MemoryScope
 * @path src/tests/contract/contract.test.ts
 */

import { describe, it, expect } from "vitest";
import { CONTRACTS, Contract } from "../../contract/contract.js";
import { TeamRole } from "../../contract/constant/teams-role.js";
import { TaskStatus } from "../../types/task.js";
import { MemoryScope } from "../../types/memory.js";

describe("CONTRACTS 常量", () => {
    it("包含所有预期的契约类型键", () => {
        expect(CONTRACTS).toEqual({
            TEAMS: "Teams",
            ROLES: "Roles",
            AGENTS: "Agents",
            DOCS: "Docs",
            SKILLS: "Skills",
            RULES: "Rules",
            TOOLS: "Tools",
            MEMORYS: "Memorys",
            TASKS: "Tasks",
        });
    });

    it("Contract 是 CONTRACTS 的别名", () => {
        expect(Contract).toBe(CONTRACTS);
    });

    it("每个值均为非空字符串", () => {
        for (const val of Object.values(CONTRACTS)) {
            expect(typeof val).toBe("string");
            expect(val.length).toBeGreaterThan(0);
        }
    });

    it("共有 9 个契约类型", () => {
        expect(Object.keys(CONTRACTS)).toHaveLength(9);
    });
});

describe("TeamRole 常量", () => {
    it("包含四种团队角色", () => {
        expect(TeamRole).toEqual({
            PLAN: "plan",
            IMPLEMENT: "implement",
            ACCEPTANCE: "acceptance",
            REVIEW: "review",
        });
    });

    it("每个角色值为小写字符串", () => {
        for (const val of Object.values(TeamRole)) {
            expect(val).toBe(val.toLowerCase());
        }
    });
});

describe("TaskStatus 常量", () => {
    it("包含所有任务状态", () => {
        expect(TaskStatus).toEqual({
            PENDING: "pending",
            IN_PROGRESS: "in_progress",
            DONE: "done",
            BLOCKED: "blocked",
            CANCELLED: "cancelled",
        });
    });

    it("共有 5 种任务状态", () => {
        expect(Object.keys(TaskStatus)).toHaveLength(5);
    });
});

describe("MemoryScope 常量", () => {
    it("包含所有记忆作用域", () => {
        expect(MemoryScope).toEqual({
            AGENT: "agent",
            TEAM: "team",
            USER: "user",
            GLOBAL: "global",
            SEMANTIC: "semantic",
        });
    });

    it("共有 5 种记忆作用域", () => {
        expect(Object.keys(MemoryScope)).toHaveLength(5);
    });
});
