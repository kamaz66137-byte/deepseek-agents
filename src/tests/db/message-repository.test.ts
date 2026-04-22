/**
 * @packageDocumentation
 * @module tests-db-message-repository
 * @since 1.0.0
 * @author zkali
 * @tags [test, db, message, repository]
 * @description MessageRepository SQLite CRUD 操作测试
 * @path src/tests/db/message-repository.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createDb } from "../../db/index.js";
import type { Db } from "../../db/index.js";
import { randomUUID } from "crypto";

describe("MessageRepository", () => {
    let db: Db;

    beforeEach(() => {
        db = createDb();
    });

    it("save 保存用户消息并返回 AgentMessage", () => {
        const id = randomUUID();
        const msg = db.messages.save({
            id,
            agentId: "agent-1",
            taskId: "task-1",
            role: "user",
            content: "你好，世界",
            toolCallId: undefined,
            name: undefined,
        });

        expect(msg.id).toBe(id);
        expect(msg.role).toBe("user");
        expect(msg.content).toBe("你好，世界");
        expect(msg.toolCallId).toBeUndefined();
        expect(msg.name).toBeUndefined();
    });

    it("save 保存工具消息（含 toolCallId 和 name）", () => {
        const msg = db.messages.save({
            id: randomUUID(),
            agentId: "agent-1",
            taskId: "task-1",
            role: "tool",
            content: '{"result": "搜索结果"}',
            toolCallId: "call-123",
            name: "web_search",
        });

        expect(msg.role).toBe("tool");
        expect(msg.toolCallId).toBe("call-123");
        expect(msg.name).toBe("web_search");
    });

    it("save 保存无 taskId 的消息（taskId 为 undefined）", () => {
        const msg = db.messages.save({
            id: randomUUID(),
            agentId: "agent-1",
            taskId: undefined,
            role: "assistant",
            content: "回复内容",
            toolCallId: undefined,
            name: undefined,
        });

        expect(msg.content).toBe("回复内容");
    });

    it("listByTask 返回任务下所有消息（按时间升序）", () => {
        const agentId = "agent-2";
        const taskId = "task-2";

        db.messages.save({ id: randomUUID(), agentId, taskId, role: "user", content: "第一条", toolCallId: undefined, name: undefined });
        db.messages.save({ id: randomUUID(), agentId, taskId, role: "assistant", content: "第二条", toolCallId: undefined, name: undefined });

        const list = db.messages.listByTask(taskId);
        expect(list).toHaveLength(2);
        expect(list[0]?.role).toBe("user");
        expect(list[1]?.role).toBe("assistant");
    });

    it("listByTask 无消息时返回空数组", () => {
        expect(db.messages.listByTask("ghost-task")).toEqual([]);
    });

    it("listByAgent 返回代理的消息历史（默认最多 100 条）", () => {
        const agentId = "agent-3";

        for (let i = 0; i < 5; i++) {
            db.messages.save({ id: randomUUID(), agentId, taskId: undefined, role: "assistant", content: `消息${i}`, toolCallId: undefined, name: undefined });
        }

        const list = db.messages.listByAgent(agentId);
        expect(list).toHaveLength(5);
    });

    it("listByAgent 按时间升序返回", async () => {
        const agentId = "agent-order";

        db.messages.save({ id: randomUUID(), agentId, taskId: undefined, role: "user", content: "第一", toolCallId: undefined, name: undefined });
        await new Promise((r) => setTimeout(r, 2));
        db.messages.save({ id: randomUUID(), agentId, taskId: undefined, role: "assistant", content: "第二", toolCallId: undefined, name: undefined });

        const list = db.messages.listByAgent(agentId);
        expect(list[0]?.content).toBe("第一");
        expect(list[1]?.content).toBe("第二");
    });

    it("listByAgent 自定义 limit 参数", () => {
        const agentId = "agent-limit";

        for (let i = 0; i < 10; i++) {
            db.messages.save({ id: randomUUID(), agentId, taskId: undefined, role: "user", content: `M${i}`, toolCallId: undefined, name: undefined });
        }

        const list = db.messages.listByAgent(agentId, 3);
        expect(list).toHaveLength(3);
    });

    it("listByAgent 不同代理的消息互不影响", () => {
        db.messages.save({ id: randomUUID(), agentId: "agent-A", taskId: undefined, role: "user", content: "A的消息", toolCallId: undefined, name: undefined });
        db.messages.save({ id: randomUUID(), agentId: "agent-B", taskId: undefined, role: "user", content: "B的消息", toolCallId: undefined, name: undefined });

        expect(db.messages.listByAgent("agent-A")).toHaveLength(1);
        expect(db.messages.listByAgent("agent-B")).toHaveLength(1);
    });

    it("listByTask 不同任务的消息互不干扰", () => {
        db.messages.save({ id: randomUUID(), agentId: "a", taskId: "task-X", role: "user", content: "X消息", toolCallId: undefined, name: undefined });
        db.messages.save({ id: randomUUID(), agentId: "a", taskId: "task-Y", role: "user", content: "Y消息", toolCallId: undefined, name: undefined });

        const xList = db.messages.listByTask("task-X");
        const yList = db.messages.listByTask("task-Y");
        expect(xList).toHaveLength(1);
        expect(xList[0]?.content).toBe("X消息");
        expect(yList[0]?.content).toBe("Y消息");
    });
});
