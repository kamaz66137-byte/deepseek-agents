/**
 * @packageDocumentation
 * @module deepseek-ai-tasks-1.0.0
 * @author zkali
 * @tags ai, contract, task
 * @description Task 契约定义，用于描述任务的静态配置与持久化结构
 * @path src/contract/tasks.ts
 */

import { type CONTRACTS } from "./contract.js";

/**
 * @interface Tasks
 * @description 任务契约接口
 * @property {typeof CONTRACTS.TASKS} type - 契约类型，固定为 CONTRACTS.TASKS
 * @property {string} id - 任务唯一标识
 * @property {string} title - 任务标题
 * @property {string} description - 任务描述
 * @property {"pending" | "in_progress" | "done" | "blocked" | "cancelled"} status - 任务状态
 * @property {string} boardId - 所属看板 ID
 * @property {string} assigneeId - 分配的 Agent ID
 * @property {string} teamId - 所属团队 ID
 * @property {string[]} dependsOn - 前置任务 ID 列表
 * @property {string} content - 任务补充内容
 */
export interface Tasks {
    type: typeof CONTRACTS.TASKS;
    id: string;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "done" | "blocked" | "cancelled";
    boardId: string;
    assigneeId?: string;
    teamId?: string;
    dependsOn?: string[];
    content?: string;
}