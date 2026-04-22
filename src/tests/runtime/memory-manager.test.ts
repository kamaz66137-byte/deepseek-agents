/**
 * @packageDocumentation
 * @module tests-runtime-memory-manager
 * @since 1.0.0
 * @author zkali
 * @tags [test, runtime, memory, manager]
 * @description MemoryManager 记忆管理器功能测试，包含语义搜索
 * @path src/tests/runtime/memory-manager.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryManager } from "../../runtime/memory-manager.js";
import { createDb } from "../../db/index.js";
import type { Db } from "../../db/index.js";
import { MemoryScope } from "../../types/index.js";

describe("MemoryManager", () => {
    let db: Db;
    let manager: MemoryManager;

    beforeEach(() => {
        db = createDb();
        manager = new MemoryManager({ repo: db.memories });
    });

    it("save 保存记忆并返回 MemoryEntry", () => {
        const entry = manager.save(MemoryScope.AGENT, "agent-1", "task:t1:result", "任务结果内容", ["task-result"]);
        expect(entry.scope).toBe(MemoryScope.AGENT);
        expect(entry.ownerId).toBe("agent-1");
        expect(entry.key).toBe("task:t1:result");
        expect(entry.value).toBe("任务结果内容");
        expect(entry.tags).toEqual(["task-result"]);
    });

    it("save 重复相同 key 时覆盖原有值", () => {
        manager.save(MemoryScope.AGENT, "agent-2", "preference", "旧偏好");
        const updated = manager.save(MemoryScope.AGENT, "agent-2", "preference", "新偏好");
        expect(updated.value).toBe("新偏好");
    });

    it("get 精确查找记忆", () => {
        manager.save(MemoryScope.TEAM, "team-1", "shared-info", "共享信息");
        const found = manager.get(MemoryScope.TEAM, "team-1", "shared-info");
        expect(found).toBeDefined();
        expect(found?.value).toBe("共享信息");
    });

    it("get 不存在时返回 undefined", () => {
        expect(manager.get(MemoryScope.AGENT, "nobody", "missing")).toBeUndefined();
    });

    it("query 返回 scope+ownerId 下所有记忆", () => {
        manager.save(MemoryScope.AGENT, "agent-3", "k1", "v1");
        manager.save(MemoryScope.AGENT, "agent-3", "k2", "v2");
        manager.save(MemoryScope.TEAM, "team-x", "k3", "v3");

        const result = manager.query(MemoryScope.AGENT, "agent-3");
        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
    });

    it("query 带 key 参数时精确过滤", () => {
        manager.save(MemoryScope.AGENT, "agent-4", "key-a", "a");
        manager.save(MemoryScope.AGENT, "agent-4", "key-b", "b");

        const result = manager.query(MemoryScope.AGENT, "agent-4", "key-a");
        expect(result.items).toHaveLength(1);
        expect(result.items[0]?.value).toBe("a");
    });

    it("remove 删除记忆返回 true", () => {
        manager.save(MemoryScope.AGENT, "agent-5", "del-key", "要删");
        expect(manager.remove(MemoryScope.AGENT, "agent-5", "del-key")).toBe(true);
        expect(manager.get(MemoryScope.AGENT, "agent-5", "del-key")).toBeUndefined();
    });

    it("remove 不存在的记忆返回 false", () => {
        expect(manager.remove(MemoryScope.AGENT, "nobody", "nope")).toBe(false);
    });

    it("buildContextBlock 无记忆时返回空字符串", () => {
        expect(manager.buildContextBlock("empty-agent")).toBe("");
    });

    it("buildContextBlock 有记忆时返回格式化文本块", () => {
        manager.save(MemoryScope.AGENT, "agent-ctx", "task:t1:result", "任务1完成", ["task-result"]);
        manager.save(MemoryScope.AGENT, "agent-ctx", "task:t2:result", "任务2完成", ["task-result"]);

        const block = manager.buildContextBlock("agent-ctx");
        expect(block).toContain("## 已有记忆");
        expect(block).toContain("[task:t1:result]");
        expect(block).toContain("任务1完成");
        expect(block).toContain("[task:t2:result]");
    });

    it("buildContextBlock 最大条数限制生效", () => {
        for (let i = 0; i < 25; i++) {
            manager.save(MemoryScope.AGENT, "agent-max", `key-${i}`, `value-${i}`);
        }
        const block = manager.buildContextBlock("agent-max", 5);
        // 最多包含 5 条记忆
        const matches = block.match(/\[key-/g);
        expect(matches?.length).toBeLessThanOrEqual(5);
    });

    it("buildTeamContextBlock 无记忆时返回空字符串", () => {
        expect(manager.buildTeamContextBlock("empty-team")).toBe("");
    });

    it("buildTeamContextBlock 有记忆时返回团队上下文文本", () => {
        manager.save(MemoryScope.TEAM, "team-ctx", "共享策略", "使用微服务架构");

        const block = manager.buildTeamContextBlock("team-ctx");
        expect(block).toContain("## 团队共享记忆");
        expect(block).toContain("[共享策略]");
        expect(block).toContain("使用微服务架构");
    });

    it("saveSemanticMemory 使用 SEMANTIC 作用域保存", () => {
        const entry = manager.saveSemanticMemory("agent-sem", "关于 React", "React 是一个前端框架", ["frontend"]);
        expect(entry.scope).toBe(MemoryScope.SEMANTIC);
        expect(entry.ownerId).toBe("agent-sem");
    });

    it("searchSemantic 按关键词检索语义记忆", () => {
        manager.saveSemanticMemory("agent-s1", "react-info", "React 是一个用于构建用户界面的 JavaScript 库");
        manager.saveSemanticMemory("agent-s1", "vue-info", "Vue 是一个渐进式前端框架");
        manager.saveSemanticMemory("agent-s1", "django-info", "Django 是 Python 的 Web 框架");

        const results = manager.searchSemantic("React JavaScript");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]?.key).toBe("react-info");
    });

    it("searchSemantic 空查询返回空数组", () => {
        manager.saveSemanticMemory("agent-s2", "k1", "内容1");
        expect(manager.searchSemantic("   ")).toEqual([]);
    });

    it("searchSemantic 带 ownerId 限制检索范围", () => {
        manager.saveSemanticMemory("owner-A", "key-a", "人工智能技术");
        manager.saveSemanticMemory("owner-B", "key-b", "人工智能研究");

        const results = manager.searchSemantic("人工智能", "owner-A");
        expect(results).toHaveLength(1);
        expect(results[0]?.ownerId).toBe("owner-A");
    });

    it("searchSemantic maxResults 限制返回条数", () => {
        for (let i = 0; i < 20; i++) {
            manager.saveSemanticMemory(`owner-mr-${i}`, `k${i}`, `机器学习算法 ${i}`);
        }

        const results = manager.searchSemantic("机器学习", undefined, 5);
        expect(results.length).toBeLessThanOrEqual(5);
    });

    it("searchSemantic 无 ownerId 时检索所有语义记忆", () => {
        manager.saveSemanticMemory("owner-X", "k1", "深度学习模型");
        manager.saveSemanticMemory("owner-Y", "k2", "深度学习训练");

        const results = manager.searchSemantic("深度学习");
        expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it("searchSemantic 无匹配结果时返回空数组", () => {
        manager.saveSemanticMemory("agent-no-match", "k1", "Python 编程");
        const results = manager.searchSemantic("Haskell Erlang");
        expect(results).toEqual([]);
    });

    it("searchSemantic 按匹配关键词数量排序（命中多的排前）", () => {
        manager.saveSemanticMemory("ranker", "full-match", "机器学习 深度学习 神经网络");
        manager.saveSemanticMemory("ranker", "partial-match", "机器学习 介绍");

        const results = manager.searchSemantic("机器学习 深度学习");
        expect(results[0]?.key).toBe("full-match");
    });
});
