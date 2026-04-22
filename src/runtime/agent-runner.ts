/**
 * @packageDocumentation
 * @module runtime-agent-runner
 * @since 1.0.0
 * @author zkali
 * @tags [runtime, agent, runner]
 * @description Agent 执行引擎：加载配置、构建提示词、调用 DeepSeek API、处理工具调用循环
 * @path src/runtime/agent-runner.ts
 */

import { randomUUID } from "crypto";
import type { Db } from "../db/index.js";
import type { DeepSeekClient, ChatMessage } from "../api/deepseek.js";
import type { ToolRegistry } from "./registry.js";
import type { MemoryManager } from "./memory-manager.js";
import { TaskStatus } from "../types/index.js";
import type { Task, AgentRunResult } from "../types/index.js";
import type { AgentRecord } from "../db/index.js";

/**
 * @const MAX_TOOL_ITERATIONS
 * @description 工具调用最大循环次数，防止无限循环
 */
const MAX_TOOL_ITERATIONS = 10;

/**
 * @interface AgentRunnerOptions
 * @description AgentRunner 初始化选项
 * @property {Db} db - 数据库访问对象
 * @property {DeepSeekClient} api - DeepSeek API 客户端
 * @property {ToolRegistry} toolRegistry - 工具注册表
 * @property {MemoryManager} memoryManager - 记忆管理器
 * @property {number} [maxInputChars] - 系统提示词最大字符数
 */
export interface AgentRunnerOptions {
    readonly db: Db;
    readonly api: DeepSeekClient;
    readonly toolRegistry: ToolRegistry;
    readonly memoryManager: MemoryManager;
    readonly maxInputChars?: number;
}

/**
 * @class AgentRunner
 * @description 单个 Agent 执行引擎，实现 ReAct（推理-行动）循环
 */
export class AgentRunner {
    readonly #db: Db;
    readonly #api: DeepSeekClient;
    readonly #toolRegistry: ToolRegistry;
    readonly #memoryManager: MemoryManager;
    readonly #maxInputChars: number;

    /**
     * @constructor
     * @param {AgentRunnerOptions} options - 初始化选项
     */
    constructor(options: AgentRunnerOptions) {
        this.#db = options.db;
        this.#api = options.api;
        this.#toolRegistry = options.toolRegistry;
        this.#memoryManager = options.memoryManager;
        this.#maxInputChars = options.maxInputChars ?? 32_000;
    }

    /**
     * @function run
     * @async
     * @description 执行 Agent 任务：调用 DeepSeek API，处理工具调用，返回结果
     * @param {Task} task - 待执行任务
     * @param {AgentRecord} agent - 执行该任务的 Agent 记录
     * @returns {Promise<AgentRunResult>} Agent 执行结果
     * @throws {Error} 任务执行失败时抛出错误（并将任务状态设为 blocked）
     */
    async run(task: Task, agent: AgentRecord): Promise<AgentRunResult> {
        // 乐观锁：将任务状态 pending → in_progress
        const claimed = this.#db.tasks.casStatus(task.id, TaskStatus.PENDING, TaskStatus.IN_PROGRESS);
        if (!claimed) {
            throw new Error(`Task ${task.id} is not in pending status, cannot start`);
        }

        try {
            const result = await this.#execute(task, agent);
            // 写回执行结果
            this.#db.tasks.update({ id: task.id, status: TaskStatus.DONE, content: result.content });
            return result;
        } catch (err) {
            // 执行失败 → 标记为 blocked
            const message = err instanceof Error ? err.message : String(err);
            this.#db.tasks.update({ id: task.id, status: TaskStatus.BLOCKED, content: `ERROR: ${message}` });
            // 记录错误消息到历史
            this.#db.messages.save({
                id: randomUUID(),
                agentId: agent.id,
                taskId: task.id,
                role: "assistant",
                content: `[EXECUTION ERROR] ${message}`,
                toolCallId: undefined,
                name: undefined,
            });
            throw err;
        }
    }

    /**
     * @function #execute
     * @async
     * @description 内部执行方法：构建消息列表，运行工具调用循环
     * @param {Task} task - 任务
     * @param {AgentRecord} agent - Agent 记录
     * @returns {Promise<AgentRunResult>} 执行结果
     */
    async #execute(task: Task, agent: AgentRecord): Promise<AgentRunResult> {
        const systemPrompt = this.#buildSystemPrompt(agent, task.teamId);
        const userMessage = this.#buildUserMessage(task);
        const tools = this.#toolRegistry.toFunctionTools(agent.toolBundle);

        // 初始消息列表
        const messages: ChatMessage[] = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ];

        this.#saveMessage(agent.id, task.id, "user", userMessage);

        let finalContent = "";
        let reasoning: string | undefined;

        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            const truncatedMessages = this.#truncateMessages(messages);
            const response = await this.#api.chatCompletion({
                model: agent.deepseekModel,
                messages: truncatedMessages,
                ...(agent.temperature != null ? { temperature: agent.temperature } : {}),
                ...(tools.length > 0 ? { tools, tool_choice: "auto" as const } : {}),
            });

            const choice = response.choices[0];
            if (!choice) throw new Error("DeepSeek API returned empty choices");

            const { message } = choice;
            reasoning = message.reasoning_content ?? reasoning;

            if (choice.finish_reason === "tool_calls" && message.tool_calls && message.tool_calls.length > 0) {
                // 处理工具调用
                messages.push({
                    role: "assistant",
                    content: message.content,
                    tool_calls: message.tool_calls,
                });
                this.#saveMessage(agent.id, task.id, "assistant", message.content ?? "");

                for (const toolCall of message.tool_calls) {
                    const toolResult = await this.#executeTool(agent, toolCall.id, toolCall.function.name, toolCall.function.arguments);
                    messages.push({
                        role: "tool",
                        content: toolResult,
                        tool_call_id: toolCall.id,
                        name: toolCall.function.name,
                    });
                    this.#saveMessage(agent.id, task.id, "tool", toolResult, toolCall.id, toolCall.function.name);
                }
            } else {
                // 正常结束或达到 length 限制
                finalContent = message.content ?? "";
                this.#saveMessage(agent.id, task.id, "assistant", finalContent);
                break;
            }
        }

        // 将任务结果写入团队记忆
        if (task.teamId) {
            this.#memoryManager.save(
                "team" as const,
                task.teamId,
                `task:${task.id}:result`,
                finalContent.slice(0, 2000),
                ["task-result", task.id],
            );
        }
        // 将任务结果写入 Agent 私有记忆
        this.#memoryManager.save(
            "agent" as const,
            agent.id,
            `task:${task.id}:result`,
            finalContent.slice(0, 2000),
            ["task-result", task.id],
        );

        return {
            id: randomUUID(),
            agentId: agent.id,
            content: finalContent,
            ...(reasoning != null ? { reasoning } : {}),
            messages: this.#db.messages.listByTask(task.id),
        };
    }

    /**
     * @function #buildSystemPrompt
     * @description 构建系统提示词（Agent prompt + 记忆上下文，截断至 maxInputChars）
     * @param {AgentRecord} agent - Agent 记录
     * @param {string | undefined} teamId - 团队 ID
     * @returns {string} 系统提示词
     */
    #buildSystemPrompt(agent: AgentRecord, teamId: string | undefined): string {
        let prompt = agent.prompt;
        prompt += this.#memoryManager.buildContextBlock(agent.id);
        if (teamId) {
            prompt += this.#memoryManager.buildTeamContextBlock(teamId);
        }
        // 截断至限制
        if (prompt.length > this.#maxInputChars) {
            prompt = prompt.slice(0, this.#maxInputChars);
        }
        return prompt;
    }

    /**
     * @function #buildUserMessage
     * @description 构建用户消息（任务标题 + 描述）
     * @param {Task} task - 任务
     * @returns {string} 用户消息
     */
    #buildUserMessage(task: Task): string {
        const lines: string[] = [`## 任务: ${task.title}`];
        if (task.description) lines.push(`\n${task.description}`);
        if (task.content) lines.push(`\n### 补充信息\n${task.content}`);
        return lines.join("\n");
    }

    /**
     * @function #executeTool
     * @async
     * @description 执行工具调用，返回序列化后的结果字符串
     * @param {AgentRecord} agent - Agent 记录
     * @param {string} callId - 工具调用 ID
     * @param {string} toolName - 工具名称
     * @param {string} argsJson - 工具参数 JSON 字符串
     * @returns {Promise<string>} 工具调用结果（字符串）
     */
    async #executeTool(agent: AgentRecord, callId: string, toolName: string, argsJson: string): Promise<string> {
        const tool = this.#toolRegistry.findTool(agent.toolBundle, toolName);
        if (!tool) {
            return JSON.stringify({ error: `Unknown tool: ${toolName}`, callId });
        }
        try {
            const args = JSON.parse(argsJson) as unknown;
            const output = await tool.execute(args);
            return typeof output === "string" ? output : JSON.stringify(output);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return JSON.stringify({ error: `Tool execution failed: ${message}`, callId, toolName });
        }
    }

    /**
     * @function #truncateMessages
     * @description 截断消息列表，保留 system 消息和最近的对话（控制上下文窗口）
     * @param {ChatMessage[]} messages - 消息列表
     * @returns {ChatMessage[]} 截断后的消息列表
     */
    #truncateMessages(messages: ChatMessage[]): ChatMessage[] {
        let totalChars = 0;
        const system = messages[0];
        const rest = messages.slice(1);

        const kept: ChatMessage[] = [];
        for (let i = rest.length - 1; i >= 0; i--) {
            const msg = rest[i];
            if (!msg) continue;
            const chars = (msg.content?.length ?? 0);
            if (totalChars + chars > this.#maxInputChars * 0.8) break;
            totalChars += chars;
            kept.unshift(msg);
        }

        return system ? [system, ...kept] : kept;
    }

    /**
     * @function #saveMessage
     * @description 保存消息到数据库
     * @param {string} agentId - Agent ID
     * @param {string} taskId - 任务 ID
     * @param {ChatMessage["role"]} role - 消息角色
     * @param {string} content - 消息内容
     * @param {string} [toolCallId] - 工具调用 ID
     * @param {string} [name] - 工具名称
     */
    #saveMessage(agentId: string, taskId: string, role: ChatMessage["role"], content: string, toolCallId?: string, name?: string): void {
        this.#db.messages.save({
            id: randomUUID(),
            agentId,
            taskId,
            role,
            content,
            toolCallId,
            name,
        });
    }
}
