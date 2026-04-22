/**
 * @packageDocumentation
 * @module events
 * @since 1.0.0
 * @author zkali
 * @tags [events, bus, task, board]
 * @description 内部事件总线：定义任务生命周期事件类型并提供基于 EventEmitter 的发布/订阅接口，
 *              可扩展为 WebSocket 或 Redis Pub/Sub 通知前端。
 * @path src/events/index.ts
 */

import { EventEmitter } from "events";

// ─────────────────────────────── 事件类型定义 ───────────────────────────────

/**
 * @interface TaskStartedEvent
 * @description 任务开始执行事件
 * @property {"task:started"} type - 事件类型
 * @property {string} taskId - 任务 ID
 * @property {string} boardId - 所属看板 ID
 * @property {string} agentId - 执行代理 ID
 * @property {Date} timestamp - 事件发生时间
 */
export interface TaskStartedEvent {
    readonly type: "task:started";
    readonly taskId: string;
    readonly boardId: string;
    readonly agentId: string;
    readonly timestamp: Date;
}

/**
 * @interface TaskDoneEvent
 * @description 任务完成事件
 * @property {"task:done"} type - 事件类型
 * @property {string} taskId - 任务 ID
 * @property {string} boardId - 所属看板 ID
 * @property {string} agentId - 执行代理 ID
 * @property {string} content - 任务执行结果
 * @property {Date} timestamp - 事件发生时间
 */
export interface TaskDoneEvent {
    readonly type: "task:done";
    readonly taskId: string;
    readonly boardId: string;
    readonly agentId: string;
    readonly content: string;
    readonly timestamp: Date;
}

/**
 * @interface TaskBlockedEvent
 * @description 任务阻塞事件（执行失败或超时）
 * @property {"task:blocked"} type - 事件类型
 * @property {string} taskId - 任务 ID
 * @property {string} boardId - 所属看板 ID
 * @property {string} agentId - 执行代理 ID
 * @property {string} reason - 阻塞原因
 * @property {Date} timestamp - 事件发生时间
 */
export interface TaskBlockedEvent {
    readonly type: "task:blocked";
    readonly taskId: string;
    readonly boardId: string;
    readonly agentId: string;
    readonly reason: string;
    readonly timestamp: Date;
}

/**
 * @interface TaskRetryEvent
 * @description 任务重试事件
 * @property {"task:retry"} type - 事件类型
 * @property {string} taskId - 任务 ID
 * @property {string} boardId - 所属看板 ID
 * @property {number} retryCount - 当前重试次数
 * @property {number} retryLimit - 最大重试次数
 * @property {Date} timestamp - 事件发生时间
 */
export interface TaskRetryEvent {
    readonly type: "task:retry";
    readonly taskId: string;
    readonly boardId: string;
    readonly retryCount: number;
    readonly retryLimit: number;
    readonly timestamp: Date;
}

/**
 * @interface BoardStartedEvent
 * @description 看板启动事件
 * @property {"board:started"} type - 事件类型
 * @property {string} boardId - 看板 ID
 * @property {string} objective - 用户目标
 * @property {number} taskCount - 计划任务总数
 * @property {Date} timestamp - 事件发生时间
 */
export interface BoardStartedEvent {
    readonly type: "board:started";
    readonly boardId: string;
    readonly objective: string;
    readonly taskCount: number;
    readonly timestamp: Date;
}

/**
 * @interface BoardCompletedEvent
 * @description 看板完成事件
 * @property {"board:completed"} type - 事件类型
 * @property {string} boardId - 看板 ID
 * @property {string} summary - 验收摘要
 * @property {Date} timestamp - 事件发生时间
 */
export interface BoardCompletedEvent {
    readonly type: "board:completed";
    readonly boardId: string;
    readonly summary: string;
    readonly timestamp: Date;
}

/**
 * @type AgentEvent
 * @description 所有 Agent 事件的联合类型
 */
export type AgentEvent =
    | TaskStartedEvent
    | TaskDoneEvent
    | TaskBlockedEvent
    | TaskRetryEvent
    | BoardStartedEvent
    | BoardCompletedEvent;

/**
 * @type AgentEventType
 * @description 所有 Agent 事件类型字面量
 */
export type AgentEventType = AgentEvent["type"];

// ─────────────────────────────── EventBus 接口 ───────────────────────────────

/**
 * @interface EventBus
 * @description 事件总线接口，提供类型安全的发布/订阅 API
 */
export interface EventBus {
    /**
     * @function emit
     * @description 发布事件
     * @param {AgentEvent} event - 事件对象
     */
    emit(event: AgentEvent): void;

    /**
     * @function on
     * @description 订阅指定类型的事件
     * @param {T} type - 事件类型
     * @param {(event: Extract<AgentEvent, { type: T }>) => void} handler - 事件处理函数
     * @returns {() => void} 取消订阅函数
     */
    on<T extends AgentEventType>(
        type: T,
        handler: (event: Extract<AgentEvent, { type: T }>) => void,
    ): () => void;

    /**
     * @function once
     * @description 订阅指定类型的事件，仅触发一次
     * @param {T} type - 事件类型
     * @param {(event: Extract<AgentEvent, { type: T }>) => void} handler - 事件处理函数
     * @returns {() => void} 取消订阅函数
     */
    once<T extends AgentEventType>(
        type: T,
        handler: (event: Extract<AgentEvent, { type: T }>) => void,
    ): () => void;

    /**
     * @function off
     * @description 取消订阅
     * @param {AgentEventType} type - 事件类型
     * @param {(event: AgentEvent) => void} handler - 事件处理函数
     */
    off(type: AgentEventType, handler: (event: AgentEvent) => void): void;
}

// ─────────────────────────────── 工厂函数 ───────────────────────────────

/**
 * @function createEventBus
 * @description 创建基于 Node.js EventEmitter 的事件总线实例
 * @returns {EventBus} 事件总线实例
 */
export function createEventBus(): EventBus {
    const emitter = new EventEmitter();
    // 防止因订阅过多导致内存泄漏警告
    emitter.setMaxListeners(100);

    return {
        emit(event: AgentEvent): void {
            emitter.emit(event.type, event);
        },

        on<T extends AgentEventType>(
            type: T,
            handler: (event: Extract<AgentEvent, { type: T }>) => void,
        ): () => void {
            emitter.on(type, handler as (e: AgentEvent) => void);
            return () => emitter.off(type, handler as (e: AgentEvent) => void);
        },

        once<T extends AgentEventType>(
            type: T,
            handler: (event: Extract<AgentEvent, { type: T }>) => void,
        ): () => void {
            emitter.once(type, handler as (e: AgentEvent) => void);
            return () => emitter.off(type, handler as (e: AgentEvent) => void);
        },

        off(type: AgentEventType, handler: (event: AgentEvent) => void): void {
            emitter.off(type, handler);
        },
    };
}
