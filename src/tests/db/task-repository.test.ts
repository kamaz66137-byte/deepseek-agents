/**
 * @packageDocumentation
 * @module tests-db-task-repository
 * @since 1.0.0
 * @author zkali
 * @tags [test, db, task, repository]
 * @description TaskRepository SQLite CRUD 操作测试，包含乐观锁与重试逻辑
 * @path src/tests/db/task-repository.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createDb } from "../../db/index.js";
import type { Db } from "../../db/index.js";
import { TaskStatus } from "../../types/index.js";
import { randomUUID } from "crypto";

/**
 * @description 创建测试用团队、代理、看板的辅助函数
 * @param {Db} db - 数据库实例
 * @returns {{ teamId: string; agentId: string; boardId: string }} 创建的资源 ID
 */
function seedFixtures(db: Db): { teamId: string; agentId: string; boardId: string } {
    const teamId = randomUUID();
    const agentId = randomUUID();
    const boardId = randomUUID();

    db.teams.upsert({ id: teamId, name: "测试团队", description: "", logo: "", content: "" });
    db.agents.upsert({ id: agentId, teamId, name: "测试代理", alias: "tester", description: "", role: "implement", deepseekModel: "deepseek-chat", temperature: undefined, prompt: "", toolBundle: "", skillBundle: "" });
    db.boards.insert({ id: boardId, name: "测试看板", agentId, teamId });

    return { teamId, agentId, boardId };
}

describe("TaskRepository", () => {
    let db: Db;
    let teamId: string;
    let agentId: string;
    let boardId: string;

    beforeEach(() => {
        db = createDb();
        ({ teamId, agentId, boardId } = seedFixtures(db));
    });

    it("insert 成功插入任务并返回 Task 对象", () => {
        const taskId = randomUUID();
        const task = db.tasks.insert({
            id: taskId,
            boardId,
            title: "实现功能",
            description: "功能描述",
            assigneeId: agentId,
            teamId,
        });

        expect(task.id).toBe(taskId);
        expect(task.title).toBe("实现功能");
        expect(task.description).toBe("功能描述");
        expect(task.status).toBe(TaskStatus.PENDING);
        expect(task.assigneeId).toBe(agentId);
        expect(task.teamId).toBe(teamId);
        expect(task.priority).toBe(0);
        expect(task.retryLimit).toBe(0);
        expect(task.retryCount).toBe(0);
    });

    it("insert 使用默认值（无可选字段）", () => {
        const task = db.tasks.insert({ id: randomUUID(), boardId, title: "最小任务" });
        expect(task.status).toBe(TaskStatus.PENDING);
        expect(task.priority).toBe(0);
        expect(task.retryLimit).toBe(0);
        expect(task.retryCount).toBe(0);
        expect(task.description).toBeUndefined();
        expect(task.assigneeId).toBeUndefined();
        expect(task.teamId).toBeUndefined();
    });

    it("insert 支持设置优先级、超时和重试上限", () => {
        const task = db.tasks.insert({
            id: randomUUID(),
            boardId,
            title: "高优任务",
            priority: 10,
            timeout: 5000,
            retryLimit: 3,
        });

        expect(task.priority).toBe(10);
        expect(task.timeout).toBe(5000);
        expect(task.retryLimit).toBe(3);
    });

    it("findById 找到已插入的任务", () => {
        const taskId = randomUUID();
        db.tasks.insert({ id: taskId, boardId, title: "查询任务" });
        const found = db.tasks.findById(taskId);
        expect(found).toBeDefined();
        expect(found?.id).toBe(taskId);
    });

    it("findById 不存在时返回 undefined", () => {
        expect(db.tasks.findById("nonexistent")).toBeUndefined();
    });

    it("listByBoard 返回看板内所有任务", () => {
        db.tasks.insert({ id: randomUUID(), boardId, title: "任务1" });
        db.tasks.insert({ id: randomUUID(), boardId, title: "任务2" });
        const other = createDb();
        const { boardId: otherBoard } = seedFixtures(other);

        const list = db.tasks.listByBoard(boardId);
        expect(list).toHaveLength(2);
        expect(list.map((t) => t.boardId).every((id) => id === boardId)).toBe(true);
    });

    it("listByBoard 按优先级降序排列", () => {
        db.tasks.insert({ id: randomUUID(), boardId, title: "低优", priority: 1 });
        db.tasks.insert({ id: randomUUID(), boardId, title: "高优", priority: 10 });
        db.tasks.insert({ id: randomUUID(), boardId, title: "中优", priority: 5 });

        const list = db.tasks.listByBoard(boardId);
        expect(list[0]?.title).toBe("高优");
        expect(list[1]?.title).toBe("中优");
        expect(list[2]?.title).toBe("低优");
    });

    it("update 更新任务状态", () => {
        const taskId = randomUUID();
        db.tasks.insert({ id: taskId, boardId, title: "待更新" });
        const updated = db.tasks.update({ id: taskId, status: TaskStatus.DONE, content: "完成结果" });
        expect(updated?.status).toBe(TaskStatus.DONE);
        expect(updated?.content).toBe("完成结果");
    });

    it("update 不存在的任务返回 undefined", () => {
        const result = db.tasks.update({ id: "ghost", status: TaskStatus.DONE });
        expect(result).toBeUndefined();
    });

    it("update 只更新指定字段，其他字段不变", () => {
        const taskId = randomUUID();
        db.tasks.insert({ id: taskId, boardId, title: "测试更新", description: "原描述" });
        const updated = db.tasks.update({ id: taskId, status: TaskStatus.IN_PROGRESS });
        expect(updated?.status).toBe(TaskStatus.IN_PROGRESS);
        expect(updated?.description).toBe("原描述");
    });

    it("casStatus 状态匹配时成功更新并返回 true", () => {
        const taskId = randomUUID();
        db.tasks.insert({ id: taskId, boardId, title: "CAS 测试" });
        const result = db.tasks.casStatus(taskId, TaskStatus.PENDING, TaskStatus.IN_PROGRESS);
        expect(result).toBe(true);
        expect(db.tasks.findById(taskId)?.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it("casStatus 状态不匹配时返回 false 且状态不变", () => {
        const taskId = randomUUID();
        db.tasks.insert({ id: taskId, boardId, title: "CAS 失败测试" });
        const result = db.tasks.casStatus(taskId, TaskStatus.DONE, TaskStatus.IN_PROGRESS);
        expect(result).toBe(false);
        expect(db.tasks.findById(taskId)?.status).toBe(TaskStatus.PENDING);
    });

    it("casStatus 任务不存在时返回 false", () => {
        expect(db.tasks.casStatus("ghost", TaskStatus.PENDING, TaskStatus.IN_PROGRESS)).toBe(false);
    });

    it("incrementRetryCount 递增重试计数并重置状态为 pending", () => {
        const taskId = randomUUID();
        db.tasks.insert({ id: taskId, boardId, title: "重试测试", retryLimit: 3 });
        db.tasks.casStatus(taskId, TaskStatus.PENDING, TaskStatus.IN_PROGRESS);
        db.tasks.update({ id: taskId, status: TaskStatus.BLOCKED });

        const result = db.tasks.incrementRetryCount(taskId);
        expect(result).toBe(true);

        const task = db.tasks.findById(taskId);
        expect(task?.status).toBe(TaskStatus.PENDING);
        expect(task?.retryCount).toBe(1);
        expect(task?.content).toBeUndefined();
    });

    it("incrementRetryCount 多次调用累加重试次数", () => {
        const taskId = randomUUID();
        db.tasks.insert({ id: taskId, boardId, title: "多次重试" });
        db.tasks.incrementRetryCount(taskId);
        db.tasks.incrementRetryCount(taskId);
        expect(db.tasks.findById(taskId)?.retryCount).toBe(2);
    });

    it("incrementRetryCount 任务不存在时返回 false", () => {
        expect(db.tasks.incrementRetryCount("ghost")).toBe(false);
    });

    it("insert 带 dependsOn 时正确保存依赖列表", () => {
        const t1 = randomUUID();
        const t2 = randomUUID();
        db.tasks.insert({ id: t1, boardId, title: "前置任务" });
        const t3 = randomUUID();
        db.tasks.insert({ id: t3, boardId, title: "依赖任务", dependsOn: [t1, t2] });

        const task = db.tasks.findById(t3);
        expect(task?.dependsOn).toEqual([t1, t2]);
    });
});
