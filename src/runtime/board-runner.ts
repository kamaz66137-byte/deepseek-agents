/**
 * @packageDocumentation
 * @module runtime-board-runner
 * @since 1.0.0
 * @author zkali
 * @tags [runtime, board, team, orchestration]
 * @description 看板编排器：plan 代理创建任务看板，调度 implement/review/acceptance 代理完成全流程。
 *              支持优先级调度、自动重试与事件总线集成。
 * @path src/runtime/board-runner.ts
 */

import { randomUUID } from "crypto";
import type { Db } from "../db/index.js";
import type { DeepSeekClient } from "../api/deepseek.js";
import type { ToolRegistry } from "./registry.js";
import type { MemoryManager } from "./memory-manager.js";
import { AgentRunner } from "./agent-runner.js";
import { TaskStatus } from "../types/index.js";
import type { Task, BoardRecord } from "../types/index.js";
import type { AgentRecord } from "../db/index.js";
import { TeamRole } from "../contract/index.js";
import type { Agents, Teams, TeamRoleType } from "../contract/index.js";
import type { EventBus } from "../events/index.js";
import { createEventBus } from "../events/index.js";

/**
 * @interface BoardRunnerOptions
 * @description BoardRunner 初始化选项
 * @property {Db} db - 数据库访问对象
 * @property {DeepSeekClient} api - DeepSeek API 客户端
 * @property {ToolRegistry} toolRegistry - 工具注册表
 * @property {MemoryManager} memoryManager - 记忆管理器
 * @property {Teams} team - 团队契约
 * @property {Agents[]} agents - 团队所有 Agent 契约列表
 * @property {number} [maxInputChars] - 最大输入字符数
 * @property {number} [pollIntervalMs] - 任务调度轮询间隔（毫秒，默认 200）
 * @property {EventBus} [eventBus] - 外部事件总线（不传则内部创建）
 */
export interface BoardRunnerOptions {
    readonly db: Db;
    readonly api: DeepSeekClient;
    readonly toolRegistry: ToolRegistry;
    readonly memoryManager: MemoryManager;
    readonly team: Teams;
    readonly agents: readonly Agents[];
    readonly maxInputChars?: number;
    readonly pollIntervalMs?: number;
    readonly eventBus?: EventBus;
}

/**
 * @interface PlanTaskItem
 * @description 计划阶段 LLM 输出的任务条目
 * @property {string} id - 任务临时 ID（用于 dependsOn 引用）
 * @property {string} title - 任务标题
 * @property {string} description - 任务描述
 * @property {string} assigneeAlias - 执行 Agent 的 alias
 * @property {string[]} dependsOn - 前置任务 ID 列表
 * @property {number} [priority] - 优先级（越大越先执行，默认 0）
 */
interface PlanTaskItem {
    id: string;
    title: string;
    description: string;
    assigneeAlias: string;
    dependsOn: string[];
    priority?: number;
}

/**
 * @interface BoardRunResult
 * @description 看板执行结果
 * @property {BoardRecord} board - 看板记录
 * @property {Task[]} tasks - 所有任务列表（最终状态）
 * @property {string} summary - 验收摘要
 */
export interface BoardRunResult {
    readonly board: BoardRecord;
    readonly tasks: Task[];
    readonly summary: string;
}

/**
 * @const PLAN_SYSTEM_PROMPT
 * @description 计划代理的任务分解系统提示词
 */
const PLAN_SYSTEM_PROMPT = `你是一名专业的项目规划代理。
给定一个目标，你需要将其分解为可执行的子任务列表，并分配给合适的团队成员。

## 响应格式要求
必须以合法 JSON 格式响应，包含 "tasks" 数组，结构如下：
{
  "tasks": [
    {
      "id": "t1",
      "title": "任务标题",
      "description": "详细的任务描述，足够执行者理解并完成任务",
      "assigneeAlias": "执行此任务的 Agent alias",
      "dependsOn": []
    }
  ]
}

## 规则
1. id 必须唯一，格式为 t1、t2 等
2. dependsOn 填写前置任务的 id
3. assigneeAlias 必须是团队成员的 alias
4. 任务描述要清晰、具体、可执行
5. 只输出 JSON，不要添加任何其他文字`;

/**
 * @class BoardRunner
 * @description 看板编排器，管理团队多代理协作的完整生命周期。
 *              支持优先级调度（priority 越大越先执行）、自动重试（retryLimit）和事件总线通知。
 */
export class BoardRunner {
    readonly #db: Db;
    readonly #api: DeepSeekClient;
    readonly #toolRegistry: ToolRegistry;
    readonly #memoryManager: MemoryManager;
    readonly #team: Teams;
    readonly #agents: readonly Agents[];
    readonly #pollIntervalMs: number;
    readonly #agentRunner: AgentRunner;
    readonly #eventBus: EventBus;

    /**
     * @constructor
     * @param {BoardRunnerOptions} options - 初始化选项
     */
    constructor(options: BoardRunnerOptions) {
        this.#db = options.db;
        this.#api = options.api;
        this.#toolRegistry = options.toolRegistry;
        this.#memoryManager = options.memoryManager;
        this.#team = options.team;
        this.#agents = options.agents;
        this.#pollIntervalMs = options.pollIntervalMs ?? 200;
        this.#eventBus = options.eventBus ?? createEventBus();
        this.#agentRunner = new AgentRunner({
            db: options.db,
            api: options.api,
            toolRegistry: options.toolRegistry,
            memoryManager: options.memoryManager,
            ...(options.maxInputChars != null ? { maxInputChars: options.maxInputChars } : {}),
        });

        // 将团队和代理配置持久化到 DB
        this.#syncContracts();
    }

    /**
     * @function events
     * @description 获取事件总线（可用于外部订阅任务/看板事件）
     * @returns {EventBus} 事件总线
     */
    get events(): EventBus {
        return this.#eventBus;
    }

    /**
     * @function run
     * @async
     * @description 执行完整的团队任务流程：计划 → 实现 → 审核 → 验收
     * @param {string} objective - 用户原始目标描述
     * @returns {Promise<BoardRunResult>} 看板执行结果
     * @throws {Error} 无法找到计划代理或任务执行失败时抛出
     */
    async run(objective: string): Promise<BoardRunResult> {
        console.log(`[BoardRunner] 开始执行目标: ${objective}`);

        // 1. 找到计划代理
        const planAgentRecord = this.#getAgentByRole(TeamRole.PLAN);
        if (!planAgentRecord) throw new Error(`团队 ${this.#team.name} 没有 plan 角色的代理`);

        // 2. 计划代理分解任务
        const planItems = await this.#planTasks(objective, planAgentRecord);
        console.log(`[BoardRunner] 计划生成 ${planItems.length} 个任务`);

        // 3. 创建看板
        const boardId = randomUUID();
        const board = this.#db.boards.insert(
            { id: boardId, name: `Board: ${objective.slice(0, 50)}`, agentId: planAgentRecord.id, teamId: this.#team.id },
            objective,
        );

        // 4. 创建任务记录（使用临时 ID 映射到真实 UUID）
        const idMap = new Map<string, string>();
        for (const item of planItems) {
            const realId = randomUUID();
            idMap.set(item.id, realId);
        }

        for (const item of planItems) {
            const realId = idMap.get(item.id);
            if (!realId) continue;
            const assignee = this.#db.agents.findByAlias(item.assigneeAlias, this.#team.id);
            const realDeps = item.dependsOn
                .map((dep) => idMap.get(dep))
                .filter((v): v is string => v != null);

            this.#db.tasks.insert({
                id: realId,
                boardId: boardId,
                title: item.title,
                description: item.description,
                ...(assignee != null ? { assigneeId: assignee.id } : {}),
                teamId: this.#team.id,
                dependsOn: realDeps,
                priority: item.priority ?? 0,
            });
        }

        // 发布看板启动事件
        this.#eventBus.emit({
            type: "board:started",
            boardId,
            objective,
            taskCount: planItems.length,
            timestamp: new Date(),
        });

        // 5. 调度执行循环
        await this.#schedulingLoop(boardId);

        // 6. 审核阶段（如有 review 代理）
        const reviewAgent = this.#getAgentByRole(TeamRole.REVIEW);
        if (reviewAgent) {
            await this.#runReview(boardId, reviewAgent);
        }

        // 7. 验收阶段（如有 acceptance 代理）
        let summary = "所有任务已完成";
        const acceptanceAgent = this.#getAgentByRole(TeamRole.ACCEPTANCE);
        if (acceptanceAgent) {
            summary = await this.#runAcceptance(boardId, objective, acceptanceAgent);
        }

        const finalTasks = this.#db.tasks.listByBoard(boardId);
        console.log(`[BoardRunner] 执行完成，共 ${finalTasks.length} 个任务`);

        // 发布看板完成事件
        this.#eventBus.emit({ type: "board:completed", boardId, summary, timestamp: new Date() });

        return { board, tasks: finalTasks, summary };
    }

    /**
     * @function #planTasks
     * @async
     * @description 调用计划代理生成任务分解
     * @param {string} objective - 用户目标
     * @param {AgentRecord} planAgent - 计划代理记录
     * @returns {Promise<PlanTaskItem[]>} 任务条目列表
     */
    async #planTasks(objective: string, planAgent: AgentRecord): Promise<PlanTaskItem[]> {
        const agentList = this.#agents
            .map((a) => `  - alias: "${a.alias}", 描述: ${a.description}, 角色: ${a.role}`)
            .join("\n");

        const userMessage = `## 目标\n${objective}\n\n## 团队成员\n${agentList}`;

        const response = await this.#api.chatCompletion({
            model: planAgent.deepseekModel,
            messages: [
                { role: "system", content: PLAN_SYSTEM_PROMPT },
                { role: "user", content: userMessage },
            ],
            ...(planAgent.temperature != null ? { temperature: planAgent.temperature } : {}),
        });

        const choice = response.choices[0];
        if (!choice) throw new Error("计划代理返回空响应");

        const raw = choice.message.content ?? "{}";
        const parsed = this.#parsePlanJson(raw);
        if (parsed.length === 0) {
            throw new Error(`计划代理未能生成有效任务列表。原始响应: ${raw.slice(0, 500)}`);
        }
        return parsed;
    }

    /**
     * @function #parsePlanJson
     * @description 解析计划代理输出的 JSON 字符串
     * @param {string} raw - 原始输出字符串
     * @returns {PlanTaskItem[]} 解析后的任务条目列表
     */
    #parsePlanJson(raw: string): PlanTaskItem[] {
        try {
            // 提取 JSON 块（应对 LLM 可能包裹 markdown 代码块的情况）
            const match = /\{[\s\S]*\}/.exec(raw);
            if (!match) return [];
            const obj = JSON.parse(match[0]) as { tasks?: unknown };
            if (!Array.isArray(obj.tasks)) return [];
            return (obj.tasks as PlanTaskItem[]).filter(
                (t): t is PlanTaskItem =>
                    typeof t === "object" &&
                    t !== null &&
                    typeof t.id === "string" &&
                    typeof t.title === "string" &&
                    typeof t.description === "string" &&
                    typeof t.assigneeAlias === "string" &&
                    Array.isArray(t.dependsOn),
            );
        } catch {
            return [];
        }
    }

    /**
     * @function #schedulingLoop
     * @async
     * @description 任务调度循环：持续查找可执行任务（按 priority 降序）并发执行，直至全部完成或出现失败；
     *              对于执行失败且 retryCount < retryLimit 的任务，自动重置为 pending 并递增计数。
     * @param {string} boardId - 看板 ID
     */
    async #schedulingLoop(boardId: string): Promise<void> {
        const MAX_CONSECUTIVE_EMPTY = 3;
        let emptyRounds = 0;

        while (true) {
            const tasks = this.#db.tasks.listByBoard(boardId);
            const allTerminal = tasks.every((t) =>
                t.status === TaskStatus.DONE ||
                t.status === TaskStatus.CANCELLED ||
                t.status === TaskStatus.BLOCKED,
            );

            if (allTerminal) break;

            const doneIds = new Set(tasks.filter((t) => t.status === TaskStatus.DONE).map((t) => t.id));
            // listByBoard 已按 priority DESC + created_at ASC 排序
            const readyTasks = tasks.filter(
                (t) =>
                    t.status === TaskStatus.PENDING &&
                    (t.dependsOn ?? []).every((dep) => doneIds.has(dep)),
            );

            if (readyTasks.length === 0) {
                const inProgress = tasks.some((t) => t.status === TaskStatus.IN_PROGRESS);
                if (!inProgress) {
                    // 没有正在执行的任务时累计空轮次，防止循环依赖导致死循环
                    emptyRounds++;
                    if (emptyRounds >= MAX_CONSECUTIVE_EMPTY) {
                        console.warn(`[BoardRunner] 调度停滞，看板 ${boardId} 存在无法执行的任务`);
                        break;
                    }
                }
                await this.#sleep(this.#pollIntervalMs);
                continue;
            }

            emptyRounds = 0;

            // 并发执行所有就绪任务（DB 已按优先级排序）
            await Promise.all(
                readyTasks.map(async (task) => {
                    const agentRecord = task.assigneeId
                        ? this.#db.agents.findById(task.assigneeId)
                        : this.#getAgentByRole(TeamRole.IMPLEMENT);

                    if (!agentRecord) {
                        console.error(`[BoardRunner] 任务 ${task.id} 无法找到执行代理`);
                        this.#db.tasks.update({ id: task.id, status: TaskStatus.BLOCKED });
                        this.#eventBus.emit({
                            type: "task:blocked",
                            taskId: task.id,
                            boardId,
                            agentId: "",
                            reason: "无法找到执行代理",
                            timestamp: new Date(),
                        });
                        return;
                    }

                    this.#eventBus.emit({
                        type: "task:started",
                        taskId: task.id,
                        boardId,
                        agentId: agentRecord.id,
                        timestamp: new Date(),
                    });

                    try {
                        console.log(`[BoardRunner] 执行任务 "${task.title}" by ${agentRecord.alias}`);
                        const result = await this.#agentRunner.run(task, agentRecord);
                        this.#eventBus.emit({
                            type: "task:done",
                            taskId: task.id,
                            boardId,
                            agentId: agentRecord.id,
                            content: result.content,
                            timestamp: new Date(),
                        });
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        console.error(`[BoardRunner] 任务 ${task.id} 执行失败: ${msg}`);

                        // 自动重试逻辑
                        const freshTask = this.#db.tasks.findById(task.id);
                        if (freshTask && freshTask.retryCount < freshTask.retryLimit) {
                            console.log(
                                `[BoardRunner] 任务 ${task.id} 第 ${freshTask.retryCount + 1}/${freshTask.retryLimit} 次重试`,
                            );
                            this.#db.tasks.incrementRetryCount(task.id);
                            this.#eventBus.emit({
                                type: "task:retry",
                                taskId: task.id,
                                boardId,
                                retryCount: freshTask.retryCount + 1,
                                retryLimit: freshTask.retryLimit,
                                timestamp: new Date(),
                            });
                        } else {
                            this.#eventBus.emit({
                                type: "task:blocked",
                                taskId: task.id,
                                boardId,
                                agentId: agentRecord.id,
                                reason: msg,
                                timestamp: new Date(),
                            });
                        }
                    }
                }),
            );
        }
    }

    /**
     * @function #runReview
     * @async
     * @description 审核阶段：审核代理检查所有 done 任务的结果
     * @param {string} boardId - 看板 ID
     * @param {AgentRecord} reviewAgent - 审核代理记录
     */
    async #runReview(boardId: string, reviewAgent: AgentRecord): Promise<void> {
        const tasks = this.#db.tasks.listByBoard(boardId).filter((t) => t.status === TaskStatus.DONE);
        if (tasks.length === 0) return;

        const taskSummaries = tasks
            .map((t) => `- **${t.title}**: ${(t.content ?? "无结果").slice(0, 300)}`)
            .join("\n");

        const reviewTaskId = randomUUID();
        const reviewTitle = "审核所有任务结果";
        const reviewDescription = `请审核以下任务的完成情况，确认是否满足要求：\n\n${taskSummaries}`;

        this.#db.tasks.insert({
            id: reviewTaskId,
            boardId,
            title: reviewTitle,
            description: reviewDescription,
            assigneeId: reviewAgent.id,
            teamId: this.#team.id,
        });

        const savedTask = this.#db.tasks.findById(reviewTaskId);
        if (!savedTask) throw new Error(`Review task ${reviewTaskId} not found after insert`);

        await this.#agentRunner.run(savedTask, reviewAgent);
    }

    /**
     * @function #runAcceptance
     * @async
     * @description 验收阶段：验收代理汇总所有结果并给出最终结论
     * @param {string} boardId - 看板 ID
     * @param {string} objective - 原始目标
     * @param {AgentRecord} acceptanceAgent - 验收代理记录
     * @returns {Promise<string>} 验收摘要
     */
    async #runAcceptance(boardId: string, objective: string, acceptanceAgent: AgentRecord): Promise<string> {
        const tasks = this.#db.tasks.listByBoard(boardId);
        const taskResults = tasks
            .map((t) => `### ${t.title} (${t.status})\n${(t.content ?? "无结果").slice(0, 500)}`)
            .join("\n\n");

        const acceptanceTaskId = randomUUID();
        this.#db.tasks.insert({
            id: acceptanceTaskId,
            boardId,
            title: "最终验收",
            description: `## 原始目标\n${objective}\n\n## 各任务结果\n${taskResults}\n\n请验收以上结果，给出整体评估和最终结论。`,
            assigneeId: acceptanceAgent.id,
            teamId: this.#team.id,
        });

        const acceptanceTask = this.#db.tasks.findById(acceptanceTaskId);
        if (!acceptanceTask) return "验收任务创建失败";

        const result = await this.#agentRunner.run(acceptanceTask, acceptanceAgent);
        return result.content;
    }

    /**
     * @function #getAgentByRole
     * @description 获取团队中指定角色的第一个 Agent 记录
     * @param {string} role - 角色（TeamRole 值）
     * @returns {AgentRecord | undefined} Agent 记录或 undefined
     */
    #getAgentByRole(role: string): AgentRecord | undefined {
        return this.#db.agents.listByRole(this.#team.id, role as TeamRoleType)[0];
    }

    /**
     * @function #syncContracts
     * @description 将团队和代理契约持久化到数据库（upsert）
     */
    #syncContracts(): void {
        // 同步团队
        this.#db.teams.upsert({
            id: this.#team.id,
            name: this.#team.name,
            description: this.#team.description,
            logo: this.#team.logo,
            content: this.#team.content,
            agents: this.#team.agents,
            tags: this.#team.tags,
        });

        // 同步代理
        for (const agent of this.#agents) {
            this.#db.agents.upsert({
                id: agent.id,
                teamId: this.#team.id,
                name: agent.name,
                alias: agent.alias,
                description: agent.description,
                role: agent.role,
                deepseekModel: agent.deepseekModel,
                temperature: agent.temperature,
                prompt: agent.prompt,
                toolBundle: agent.tools.name,
                skillBundle: agent.skills.name,
            });
        }
    }

    /**
     * @function #sleep
     * @async
     * @description 等待指定毫秒数
     * @param {number} ms - 等待时间（毫秒）
     * @returns {Promise<void>}
     */
    #sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
