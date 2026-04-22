/**
 * @packageDocumentation
 * @module runtime-task-types
 * @author zkali
 * @tags ai, runtime, task, types
 * @description Task 与 Board 运行时类型定义
 * @path src/types/task.ts
 */

/**
 * @const TaskStatus
 * @description 任务状态
 * @property {string} PENDING - 待处理
 * @property {string} IN_PROGRESS - 进行中
 * @property {string} DONE - 已完成
 * @property {string} BLOCKED - 阻塞
 * @property {string} CANCELLED - 已取消
 */
export const TaskStatus = {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    DONE: "done",
    BLOCKED: "blocked",
    CANCELLED: "cancelled",
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

/**
 * @interface Task
 * @description 任务运行时结构
 * @property {string} id - 任务唯一标识
 * @property {string} title - 任务标题
 * @property {string} [description] - 任务描述
 * @property {TaskStatus} status - 任务状态
 * @property {string} boardId - 所属看板 ID
 * @property {string} [assigneeId] - 分配的 Agent ID
 * @property {string} [teamId] - 所属团队 ID
 * @property {string[]} [dependsOn] - 前置任务 ID 列表
 * @property {string} [content] - 任务补充内容
 * @property {number} priority - 优先级（越大越先执行，默认 0）
 * @property {number | undefined} timeout - 超时时间（毫秒）
 * @property {number} retryLimit - 最大自动重试次数
 * @property {number} retryCount - 已重试次数
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 */
export interface Task {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly status: TaskStatus;
    readonly boardId: string;
    readonly assigneeId?: string;
    readonly teamId?: string;
    readonly dependsOn?: readonly string[];
    readonly content?: string;
    readonly priority: number;
    readonly timeout?: number;
    readonly retryLimit: number;
    readonly retryCount: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

/**
 * @interface CreateTaskInput
 * @description 创建任务输入
 * @property {string} id - 任务主键
 * @property {string} boardId - 目标看板 ID
 * @property {string} title - 任务标题
 * @property {string} [description] - 任务描述
 * @property {string} [assigneeId] - 分配 Agent ID
 * @property {string} [teamId] - 所属团队 ID
 * @property {string[]} [dependsOn] - 前置任务 ID 列表
 * @property {string} [content] - 任务补充内容
 * @property {number} [priority] - 优先级（默认 0）
 * @property {number} [timeout] - 超时时间（毫秒）
 * @property {number} [retryLimit] - 最大重试次数（默认 0）
 */
export interface CreateTaskInput {
    readonly id: string;
    readonly boardId: string;
    readonly title: string;
    readonly description?: string;
    readonly assigneeId?: string;
    readonly teamId?: string;
    readonly dependsOn?: readonly string[];
    readonly content?: string;
    readonly priority?: number;
    readonly timeout?: number;
    readonly retryLimit?: number;
}

/**
 * @interface UpdateTaskInput
 * @description 更新任务输入
 * @property {string} id - 任务主键
 * @property {TaskStatus} [status] - 新状态
 * @property {string} [assigneeId] - 新分配 Agent ID
 * @property {string} [description] - 新描述
 * @property {string[]} [dependsOn] - 新前置任务列表
 * @property {string} [content] - 新补充内容
 * @property {number} [retryCount] - 更新已重试次数
 */
export interface UpdateTaskInput {
    readonly id: string;
    readonly status?: TaskStatus;
    readonly assigneeId?: string;
    readonly description?: string;
    readonly dependsOn?: readonly string[];
    readonly content?: string;
    readonly retryCount?: number;
}

/**
 * @interface BoardRecord
 * @description 看板记录
 * @property {string} id - 看板唯一标识
 * @property {string} name - 看板名称
 * @property {string} agentId - 执行该看板的 Agent ID
 * @property {string} [teamId] - 关联团队 ID
 * @property {Date} createdAt - 创建时间
 */
export interface BoardRecord {
    readonly id: string;
    readonly name: string;
    readonly agentId: string;
    readonly teamId?: string;
    readonly createdAt: Date;
}

/**
 * @interface CreateBoardInput
 * @description 创建看板输入
 * @property {string} id - 看板主键
 * @property {string} name - 看板名称
 * @property {string} agentId - 执行该看板的 Agent ID
 * @property {string} [teamId] - 关联团队 ID
 */
export interface CreateBoardInput {
    readonly id: string;
    readonly name: string;
    readonly agentId: string;
    readonly teamId?: string;
}