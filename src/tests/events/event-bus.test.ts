/**
 * @packageDocumentation
 * @module tests-events-event-bus
 * @since 1.0.0
 * @author zkali
 * @tags [test, events, eventbus]
 * @description EventBus 发布/订阅功能测试
 * @path src/tests/events/event-bus.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import { createEventBus } from "../../events/index.js";
import type { TaskStartedEvent, TaskDoneEvent, TaskBlockedEvent, TaskRetryEvent, BoardStartedEvent, BoardCompletedEvent } from "../../events/index.js";

describe("createEventBus", () => {
    it("返回包含 emit/on/once/off 方法的对象", () => {
        const bus = createEventBus();
        expect(typeof bus.emit).toBe("function");
        expect(typeof bus.on).toBe("function");
        expect(typeof bus.once).toBe("function");
        expect(typeof bus.off).toBe("function");
    });

    it("on 订阅后可以接收 task:started 事件", () => {
        const bus = createEventBus();
        const handler = vi.fn();
        bus.on("task:started", handler);

        const event: TaskStartedEvent = {
            type: "task:started",
            taskId: "t1",
            boardId: "b1",
            agentId: "a1",
            timestamp: new Date(),
        };
        bus.emit(event);

        expect(handler).toHaveBeenCalledOnce();
        expect(handler).toHaveBeenCalledWith(event);
    });

    it("on 订阅后可以接收 task:done 事件", () => {
        const bus = createEventBus();
        const handler = vi.fn();
        bus.on("task:done", handler);

        const event: TaskDoneEvent = {
            type: "task:done",
            taskId: "t1",
            boardId: "b1",
            agentId: "a1",
            content: "结果内容",
            timestamp: new Date(),
        };
        bus.emit(event);

        expect(handler).toHaveBeenCalledWith(event);
    });

    it("on 订阅后可以接收 task:blocked 事件", () => {
        const bus = createEventBus();
        const handler = vi.fn();
        bus.on("task:blocked", handler);

        const event: TaskBlockedEvent = {
            type: "task:blocked",
            taskId: "t1",
            boardId: "b1",
            agentId: "a1",
            reason: "超时",
            timestamp: new Date(),
        };
        bus.emit(event);

        expect(handler).toHaveBeenCalledWith(event);
    });

    it("on 订阅后可以接收 task:retry 事件", () => {
        const bus = createEventBus();
        const handler = vi.fn();
        bus.on("task:retry", handler);

        const event: TaskRetryEvent = {
            type: "task:retry",
            taskId: "t1",
            boardId: "b1",
            retryCount: 1,
            retryLimit: 3,
            timestamp: new Date(),
        };
        bus.emit(event);

        expect(handler).toHaveBeenCalledWith(event);
    });

    it("on 订阅后可以接收 board:started 事件", () => {
        const bus = createEventBus();
        const handler = vi.fn();
        bus.on("board:started", handler);

        const event: BoardStartedEvent = {
            type: "board:started",
            boardId: "b1",
            objective: "目标",
            taskCount: 3,
            timestamp: new Date(),
        };
        bus.emit(event);

        expect(handler).toHaveBeenCalledWith(event);
    });

    it("on 订阅后可以接收 board:completed 事件", () => {
        const bus = createEventBus();
        const handler = vi.fn();
        bus.on("board:completed", handler);

        const event: BoardCompletedEvent = {
            type: "board:completed",
            boardId: "b1",
            summary: "任务完成摘要",
            timestamp: new Date(),
        };
        bus.emit(event);

        expect(handler).toHaveBeenCalledWith(event);
    });

    it("once 订阅后只触发一次", () => {
        const bus = createEventBus();
        const handler = vi.fn();
        bus.once("task:started", handler);

        const event: TaskStartedEvent = {
            type: "task:started",
            taskId: "t1",
            boardId: "b1",
            agentId: "a1",
            timestamp: new Date(),
        };
        bus.emit(event);
        bus.emit(event);
        bus.emit(event);

        expect(handler).toHaveBeenCalledOnce();
    });

    it("off 取消订阅后不再触发", () => {
        const bus = createEventBus();
        const handler = vi.fn();

        const unsubscribe = bus.on("task:started", handler);

        const event: TaskStartedEvent = {
            type: "task:started",
            taskId: "t1",
            boardId: "b1",
            agentId: "a1",
            timestamp: new Date(),
        };
        bus.emit(event);
        expect(handler).toHaveBeenCalledOnce();

        unsubscribe();
        bus.emit(event);
        expect(handler).toHaveBeenCalledOnce();
    });

    it("on 返回的取消订阅函数生效", () => {
        const bus = createEventBus();
        const handler = vi.fn();
        const unsub = bus.on("board:completed", handler);

        const event: BoardCompletedEvent = {
            type: "board:completed",
            boardId: "b1",
            summary: "摘要",
            timestamp: new Date(),
        };
        bus.emit(event);
        expect(handler).toHaveBeenCalledOnce();

        unsub();
        bus.emit(event);
        expect(handler).toHaveBeenCalledOnce();
    });

    it("不同类型的订阅互不干扰", () => {
        const bus = createEventBus();
        const startedHandler = vi.fn();
        const doneHandler = vi.fn();
        bus.on("task:started", startedHandler);
        bus.on("task:done", doneHandler);

        const doneEvent: TaskDoneEvent = {
            type: "task:done",
            taskId: "t1",
            boardId: "b1",
            agentId: "a1",
            content: "完成",
            timestamp: new Date(),
        };
        bus.emit(doneEvent);

        expect(startedHandler).not.toHaveBeenCalled();
        expect(doneHandler).toHaveBeenCalledOnce();
    });

    it("多个订阅者都能收到同一事件", () => {
        const bus = createEventBus();
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        bus.on("board:started", handler1);
        bus.on("board:started", handler2);

        const event: BoardStartedEvent = {
            type: "board:started",
            boardId: "b1",
            objective: "目标",
            taskCount: 5,
            timestamp: new Date(),
        };
        bus.emit(event);

        expect(handler1).toHaveBeenCalledOnce();
        expect(handler2).toHaveBeenCalledOnce();
    });

    it("once 返回的取消函数在触发前可以正常取消", () => {
        const bus = createEventBus();
        const handler = vi.fn();
        const unsub = bus.once("task:done", handler);

        unsub();

        const event: TaskDoneEvent = {
            type: "task:done",
            taskId: "t1",
            boardId: "b1",
            agentId: "a1",
            content: "完成",
            timestamp: new Date(),
        };
        bus.emit(event);

        expect(handler).not.toHaveBeenCalled();
    });
});
