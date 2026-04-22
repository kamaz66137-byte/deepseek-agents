/**
 * @packageDocumentation
 * @module tests-db-memory-repository
 * @since 1.0.0
 * @author zkali
 * @tags [test, db, memory, repository]
 * @description MemoryRepository SQLite CRUD 操作测试
 * @path src/tests/db/memory-repository.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createDb } from "../../db/index.js";
import type { Db } from "../../db/index.js";
import { MemoryScope } from "../../types/index.js";
import { randomUUID } from "crypto";

describe("MemoryRepository", () => {
    let db: Db;

    beforeEach(() => {
        db = createDb();
    });

    it("save 成功保存并返回 MemoryEntry", () => {
        const entry = db.memories.save({
            id: randomUUID(),
            scope: MemoryScope.AGENT,
            ownerId: "agent-1",
            key: "task:t1:result",
            value: "执行结果",
            tags: ["task-result"],
        });

        expect(entry.scope).toBe(MemoryScope.AGENT);
        expect(entry.ownerId).toBe("agent-1");
        expect(entry.key).toBe("task:t1:result");
        expect(entry.value).toBe("执行结果");
        expect(entry.tags).toEqual(["task-result"]);
        expect(entry.createdAt).toBeInstanceOf(Date);
        expect(entry.updatedAt).toBeInstanceOf(Date);
    });

    it("save 重复 scope+ownerId+key 时覆盖 value", () => {
        const id = randomUUID();
        db.memories.save({ id, scope: MemoryScope.AGENT, ownerId: "agent-1", key: "greeting", value: "你好" });
        const updated = db.memories.save({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "agent-1", key: "greeting", value: "更新后的值" });

        expect(updated.value).toBe("更新后的值");
    });

    it("findByKey 精确查找存在的记忆", () => {
        db.memories.save({ id: randomUUID(), scope: MemoryScope.TEAM, ownerId: "team-1", key: "shared-key", value: "共享值" });
        const found = db.memories.findByKey(MemoryScope.TEAM, "team-1", "shared-key");

        expect(found).toBeDefined();
        expect(found?.value).toBe("共享值");
    });

    it("findByKey 不存在时返回 undefined", () => {
        expect(db.memories.findByKey(MemoryScope.AGENT, "ghost", "missing")).toBeUndefined();
    });

    it("query 返回指定 scope+ownerId 下的所有记忆", () => {
        db.memories.save({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "agent-2", key: "k1", value: "v1" });
        db.memories.save({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "agent-2", key: "k2", value: "v2" });
        db.memories.save({ id: randomUUID(), scope: MemoryScope.TEAM, ownerId: "team-2", key: "k3", value: "v3" });

        const result = db.memories.query({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "agent-2" });
        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
    });

    it("query 带 key 参数时精确过滤", () => {
        db.memories.save({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "agent-3", key: "key-a", value: "a" });
        db.memories.save({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "agent-3", key: "key-b", value: "b" });

        const result = db.memories.query({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "agent-3", key: "key-a" });
        expect(result.items).toHaveLength(1);
        expect(result.items[0]?.key).toBe("key-a");
    });

    it("query 无匹配时返回空列表", () => {
        const result = db.memories.query({ id: randomUUID(), scope: MemoryScope.GLOBAL, ownerId: "nobody" });
        expect(result.items).toEqual([]);
        expect(result.total).toBe(0);
    });

    it("queryByScope 返回该作用域下所有记忆（跨 owner）", () => {
        db.memories.save({ id: randomUUID(), scope: MemoryScope.SEMANTIC, ownerId: "owner-a", key: "sem1", value: "语义1" });
        db.memories.save({ id: randomUUID(), scope: MemoryScope.SEMANTIC, ownerId: "owner-b", key: "sem2", value: "语义2" });
        db.memories.save({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "owner-c", key: "agent1", value: "代理" });

        const result = db.memories.queryByScope(MemoryScope.SEMANTIC);
        expect(result.items).toHaveLength(2);
        expect(result.items.every((e) => e.scope === MemoryScope.SEMANTIC)).toBe(true);
    });

    it("remove 删除存在的记忆返回 true", () => {
        db.memories.save({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "agent-4", key: "del-key", value: "要删的值" });
        const removed = db.memories.remove({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "agent-4", key: "del-key" });
        expect(removed).toBe(true);
        expect(db.memories.findByKey(MemoryScope.AGENT, "agent-4", "del-key")).toBeUndefined();
    });

    it("remove 不存在的记忆返回 false", () => {
        const removed = db.memories.remove({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "nobody", key: "ghost" });
        expect(removed).toBe(false);
    });

    it("save 不带 tags 时默认为空数组", () => {
        const entry = db.memories.save({ id: randomUUID(), scope: MemoryScope.GLOBAL, ownerId: "g1", key: "no-tags", value: "值" });
        expect(entry.tags).toEqual([]);
    });

    it("updatedAt 在覆盖更新后被刷新", async () => {
        db.memories.save({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "ts-agent", key: "ts-key", value: "旧值" });
        const before = db.memories.findByKey(MemoryScope.AGENT, "ts-agent", "ts-key");

        // 等待 1ms 确保时间戳有变化
        await new Promise((r) => setTimeout(r, 2));
        db.memories.save({ id: randomUUID(), scope: MemoryScope.AGENT, ownerId: "ts-agent", key: "ts-key", value: "新值" });
        const after = db.memories.findByKey(MemoryScope.AGENT, "ts-agent", "ts-key");

        expect(after?.updatedAt.getTime()).toBeGreaterThanOrEqual(before!.updatedAt.getTime());
    });
});
