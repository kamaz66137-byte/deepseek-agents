/**
 * @packageDocumentation
 * @module tests-runtime-agent-runner
 * @since 1.0.0
 * @author zkali
 * @tags [test, runtime, agent, runner]
 * @description AgentRunner 执行引擎测试，使用模拟依赖验证 ReAct 循环、超时和错误处理
 * @path src/tests/runtime/agent-runner.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentRunner } from "../../runtime/agent-runner.js";
import { TaskStatus } from "../../types/index.js";
import type { Task } from "../../types/index.js";
import type { AgentRecord } from "../../db/index.js";
import type { Db, TaskRepository, MessageRepository, MemoryRepository, AgentRepository, BoardRepository, ToolBundleRepository, SkillBundleRepository } from "../../db/index.js";
import type { DeepSeekClient, ChatCompletionResponse } from "../../api/deepseek.js";
import type { ToolRegistry } from "../../runtime/registry.js";
import type { MemoryManager } from "../../runtime/memory-manager.js";
import type { AgentMessage } from "../../types/index.js";
import { randomUUID } from "crypto";

/**
 * @description 创建测试用任务对象
 * @param {Partial<Task>} overrides - 覆盖字段
 * @returns {Task} 任务对象
 */
function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: randomUUID(),
        boardId: "board-1",
        title: "测试任务",
        description: "任务描述",
        status: TaskStatus.PENDING,
        priority: 0,
        retryLimit: 0,
        retryCount: 0,
        dependsOn: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

/**
 * @description 创建测试用 AgentRecord
 * @param {Partial<AgentRecord>} overrides - 覆盖字段
 * @returns {AgentRecord} 代理记录
 */
function makeAgent(overrides: Partial<AgentRecord> = {}): AgentRecord {
    return {
        id: randomUUID(),
        teamId: "team-1",
        name: "测试代理",
        alias: "tester",
        description: "测试用代理",
        role: "implement",
        deepseekModel: "deepseek-chat",
        temperature: undefined,
        prompt: "你是一个测试代理",
        toolBundle: "test-tools",
        skillBundle: "test-skills",
        ...overrides,
    };
}

/**
 * @description 创建成功的 ChatCompletion 响应
 * @param {string} content - 响应内容
 * @returns {ChatCompletionResponse} API 响应
 */
function makeChatResponse(content: string): ChatCompletionResponse {
    return {
        id: "resp-1",
        choices: [
            {
                message: { role: "assistant", content, tool_calls: undefined },
                finish_reason: "stop",
            },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    };
}

/**
 * @description 创建带工具调用的 ChatCompletion 响应
 * @param {string} toolName - 工具名
 * @param {string} args - 工具参数 JSON
 * @returns {ChatCompletionResponse} API 响应
 */
function makeToolCallResponse(toolName: string, args: string): ChatCompletionResponse {
    return {
        id: "resp-tool",
        choices: [
            {
                message: {
                    role: "assistant",
                    content: null,
                    tool_calls: [{ id: "call-1", type: "function", function: { name: toolName, arguments: args } }],
                },
                finish_reason: "tool_calls",
            },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    };
}

/**
 * @description 创建模拟 Db 对象
 * @returns {Db} 模拟数据库
 */
function makeMockDb(): Db {
    const tasks: TaskRepository = {
        insert: vi.fn(),
        findById: vi.fn(),
        listByBoard: vi.fn(),
        update: vi.fn(),
        casStatus: vi.fn().mockReturnValue(true),
        incrementRetryCount: vi.fn(),
    };

    const messages: MessageRepository = {
        save: vi.fn().mockImplementation((input) => ({
            id: input.id,
            role: input.role,
            content: input.content,
            ...(input.toolCallId != null ? { toolCallId: input.toolCallId } : {}),
            ...(input.name != null ? { name: input.name } : {}),
        })),
        listByAgent: vi.fn().mockReturnValue([]),
        listByTask: vi.fn().mockReturnValue([] as AgentMessage[]),
    };

    return {
        tasks,
        messages,
        memories: {} as unknown as MemoryRepository,
        agents: {} as unknown as AgentRepository,
        boards: {} as unknown as BoardRepository,
        toolBundles: {} as unknown as ToolBundleRepository,
        skillBundles: {} as unknown as SkillBundleRepository,
        teams: {} as unknown as import("../../db/index.js").TeamRepository,
        raw: {} as unknown as import("better-sqlite3").Database,
    };
}

/**
 * @description 创建模拟 DeepSeekClient
 * @param {ChatCompletionResponse} response - 预设响应
 * @returns {DeepSeekClient} 模拟客户端
 */
function makeMockApi(response: ChatCompletionResponse): DeepSeekClient {
    return {
        chatCompletion: vi.fn().mockResolvedValue(response),
        chatCompletionStream: vi.fn(),
    };
}

/**
 * @description 创建模拟 ToolRegistry
 * @returns {ToolRegistry} 模拟工具注册表
 */
function makeMockToolRegistry(): ToolRegistry {
    return {
        register: vi.fn(),
        unregister: vi.fn(),
        getBundle: vi.fn().mockReturnValue([]),
        listBundleNames: vi.fn().mockReturnValue([]),
        findTool: vi.fn().mockReturnValue(undefined),
        toFunctionTools: vi.fn().mockReturnValue([]),
        persistToDb: vi.fn(),
        loadFromDb: vi.fn(),
    } as unknown as ToolRegistry;
}

/**
 * @description 创建模拟 MemoryManager
 * @returns {MemoryManager} 模拟记忆管理器
 */
function makeMockMemoryManager(): MemoryManager {
    return {
        save: vi.fn().mockReturnValue({ id: "mem-1", scope: "agent", ownerId: "a1", key: "k", value: "v", createdAt: new Date(), updatedAt: new Date() }),
        get: vi.fn(),
        query: vi.fn(),
        remove: vi.fn(),
        buildContextBlock: vi.fn().mockReturnValue(""),
        buildTeamContextBlock: vi.fn().mockReturnValue(""),
        saveSemanticMemory: vi.fn(),
        searchSemantic: vi.fn(),
    } as unknown as MemoryManager;
}

describe("AgentRunner", () => {
    let db: Db;
    let api: DeepSeekClient;
    let toolRegistry: ToolRegistry;
    let memoryManager: MemoryManager;
    let runner: AgentRunner;
    const task = makeTask();
    const agent = makeAgent();

    beforeEach(() => {
        db = makeMockDb();
        api = makeMockApi(makeChatResponse("任务完成，结果如下"));
        toolRegistry = makeMockToolRegistry();
        memoryManager = makeMockMemoryManager();
        runner = new AgentRunner({ db, api, toolRegistry, memoryManager });
    });

    it("run 成功执行并返回 AgentRunResult", async () => {
        const result = await runner.run(task, agent);

        expect(result.content).toBe("任务完成，结果如下");
        expect(result.agentId).toBe(agent.id);
        expect(typeof result.id).toBe("string");
    });

    it("run 调用 casStatus 从 PENDING 转换为 IN_PROGRESS", async () => {
        await runner.run(task, agent);
        expect(db.tasks.casStatus).toHaveBeenCalledWith(task.id, TaskStatus.PENDING, TaskStatus.IN_PROGRESS);
    });

    it("run 成功后更新任务状态为 DONE", async () => {
        await runner.run(task, agent);
        expect(db.tasks.update).toHaveBeenCalledWith(
            expect.objectContaining({ id: task.id, status: TaskStatus.DONE, content: "任务完成，结果如下" }),
        );
    });

    it("run casStatus 返回 false 时抛出错误", async () => {
        vi.mocked(db.tasks.casStatus).mockReturnValue(false);
        await expect(runner.run(task, agent)).rejects.toThrow(`Task ${task.id} is not in pending status`);
    });

    it("run API 调用失败时将任务标记为 BLOCKED 并重新抛出", async () => {
        const apiError = new Error("API 请求失败");
        vi.mocked(api.chatCompletion).mockRejectedValue(apiError);

        await expect(runner.run(task, agent)).rejects.toThrow("API 请求失败");
        expect(db.tasks.update).toHaveBeenCalledWith(
            expect.objectContaining({ id: task.id, status: TaskStatus.BLOCKED }),
        );
    });

    it("run API 返回 empty choices 时抛出错误", async () => {
        vi.mocked(api.chatCompletion).mockResolvedValue({
            id: "r1",
            choices: [],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        });

        await expect(runner.run(task, agent)).rejects.toThrow("DeepSeek API returned empty choices");
    });

    it("run 调用 MemoryManager.buildContextBlock 构建系统提示词", async () => {
        await runner.run(task, agent);
        expect(memoryManager.buildContextBlock).toHaveBeenCalledWith(agent.id);
    });

    it("run 有 teamId 时也调用 buildTeamContextBlock", async () => {
        const taskWithTeam = makeTask({ teamId: "team-ctx" });
        await runner.run(taskWithTeam, agent);
        expect(memoryManager.buildTeamContextBlock).toHaveBeenCalledWith("team-ctx");
    });

    it("run 无 teamId 时不调用 buildTeamContextBlock", async () => {
        const taskNoTeam = makeTask({ teamId: undefined });
        await runner.run(taskNoTeam, agent);
        expect(memoryManager.buildTeamContextBlock).not.toHaveBeenCalled();
    });

    it("run 将任务结果写入 Agent 私有记忆", async () => {
        await runner.run(task, agent);
        expect(memoryManager.save).toHaveBeenCalledWith(
            "agent",
            agent.id,
            `task:${task.id}:result`,
            expect.any(String),
            expect.arrayContaining(["task-result"]),
        );
    });

    it("run 有 teamId 时将任务结果写入团队记忆", async () => {
        const taskWithTeam = makeTask({ teamId: "team-mem" });
        await runner.run(taskWithTeam, agent);
        expect(memoryManager.save).toHaveBeenCalledWith(
            "team",
            "team-mem",
            `task:${taskWithTeam.id}:result`,
            expect.any(String),
            expect.arrayContaining(["task-result"]),
        );
    });

    it("run 保存用户消息和代理回复消息到数据库", async () => {
        await runner.run(task, agent);
        const saveCall = vi.mocked(db.messages.save);
        const savedRoles = saveCall.mock.calls.map((c) => c[0].role);
        expect(savedRoles).toContain("user");
        expect(savedRoles).toContain("assistant");
    });

    it("run 超时时将任务标记为 BLOCKED 并抛出超时错误", async () => {
        const slowApi: DeepSeekClient = {
            chatCompletion: vi.fn().mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(makeChatResponse("延迟结果")), 500)),
            ),
            chatCompletionStream: vi.fn(),
        };

        const timedRunner = new AgentRunner({ db, api: slowApi, toolRegistry, memoryManager });
        const taskWithTimeout = makeTask({ timeout: 50 });

        await expect(timedRunner.run(taskWithTimeout, agent)).rejects.toThrow(/timed out/i);
        expect(db.tasks.update).toHaveBeenCalledWith(
            expect.objectContaining({ id: taskWithTimeout.id, status: TaskStatus.BLOCKED }),
        );
    });

    it("run 工具调用循环：执行工具后继续对话", async () => {
        const toolName = "web_search";
        const toolArgs = JSON.stringify({ query: "AI 最新进展" });
        const toolResult = "搜索结果：AI 持续发展";

        const mockTool = {
            id: "tool-1",
            name: toolName,
            description: "网页搜索",
            parameters: { query: { id: "p1", type: "string", description: "查询词" } },
            required: ["query"],
            execute: vi.fn().mockResolvedValue(toolResult),
        };

        vi.mocked(toolRegistry.findTool).mockReturnValue(mockTool);
        vi.mocked(toolRegistry.toFunctionTools).mockReturnValue([
            { type: "function", function: { name: toolName, description: "搜索", parameters: { type: "object", properties: {} } } },
        ]);

        // 第一次返回工具调用，第二次返回最终结果
        vi.mocked(api.chatCompletion)
            .mockResolvedValueOnce(makeToolCallResponse(toolName, toolArgs))
            .mockResolvedValueOnce(makeChatResponse("根据搜索结果，AI 正在快速发展"));

        const result = await runner.run(task, agent);
        expect(result.content).toBe("根据搜索结果，AI 正在快速发展");
        expect(mockTool.execute).toHaveBeenCalledWith({ query: "AI 最新进展" });
    });

    it("run 工具未注册时返回错误信息并继续", async () => {
        vi.mocked(toolRegistry.findTool).mockReturnValue(undefined);
        vi.mocked(toolRegistry.toFunctionTools).mockReturnValue([
            { type: "function", function: { name: "unknown_tool", description: "未知", parameters: { type: "object", properties: {} } } },
        ]);

        vi.mocked(api.chatCompletion)
            .mockResolvedValueOnce(makeToolCallResponse("unknown_tool", "{}"))
            .mockResolvedValueOnce(makeChatResponse("工具不可用，跳过"));

        const result = await runner.run(task, agent);
        expect(result.content).toBe("工具不可用，跳过");
    });

    it("run 工具执行抛出异常时以错误信息继续", async () => {
        const brokenTool = {
            id: "tool-broken",
            name: "broken_tool",
            description: "损坏工具",
            parameters: {},
            execute: vi.fn().mockRejectedValue(new Error("工具崩溃")),
        };

        vi.mocked(toolRegistry.findTool).mockReturnValue(brokenTool);
        vi.mocked(toolRegistry.toFunctionTools).mockReturnValue([
            { type: "function", function: { name: "broken_tool", description: "损坏", parameters: { type: "object", properties: {} } } },
        ]);

        vi.mocked(api.chatCompletion)
            .mockResolvedValueOnce(makeToolCallResponse("broken_tool", "{}"))
            .mockResolvedValueOnce(makeChatResponse("工具出错，已跳过"));

        const result = await runner.run(task, agent);
        expect(result.content).toBe("工具出错，已跳过");
    });

    it("run 带 temperature 的 agent 正确传递给 API", async () => {
        const agentWithTemp = makeAgent({ temperature: 0.5 });
        await runner.run(task, agentWithTemp);
        expect(api.chatCompletion).toHaveBeenCalledWith(
            expect.objectContaining({ temperature: 0.5 }),
        );
    });

    it("run 无 temperature 的 agent 不传递 temperature", async () => {
        const agentNoTemp = makeAgent({ temperature: undefined });
        await runner.run(task, agentNoTemp);
        const callArg = vi.mocked(api.chatCompletion).mock.calls[0]?.[0];
        expect(callArg).not.toHaveProperty("temperature");
    });

    it("run maxInputChars 限制系统提示词长度", async () => {
        vi.mocked(memoryManager.buildContextBlock).mockReturnValue("A".repeat(5000));
        const smallRunner = new AgentRunner({ db, api, toolRegistry, memoryManager, maxInputChars: 100 });
        const agentWithLongPrompt = makeAgent({ prompt: "" });

        await smallRunner.run(task, agentWithLongPrompt);

        const callArg = vi.mocked(api.chatCompletion).mock.calls[0]?.[0];
        const systemMsg = callArg?.messages.find((m) => m.role === "system");
        expect(systemMsg?.content?.length).toBeLessThanOrEqual(100);
    });

    it("run 返回的 messages 来自数据库查询", async () => {
        const dbMessages: AgentMessage[] = [
            { id: "m1", role: "user", content: "用户输入" },
            { id: "m2", role: "assistant", content: "代理回复" },
        ];
        vi.mocked(db.messages.listByTask).mockReturnValue(dbMessages);

        const result = await runner.run(task, agent);
        expect(result.messages).toEqual(dbMessages);
    });

    it("run 带 reasoning_content 时返回 reasoning 字段", async () => {
        vi.mocked(api.chatCompletion).mockResolvedValue({
            id: "r1",
            choices: [
                {
                    message: { role: "assistant", content: "最终答案", reasoning_content: "推理过程" },
                    finish_reason: "stop",
                },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        });

        const result = await runner.run(task, agent);
        expect(result.reasoning).toBe("推理过程");
    });

    it("run 无 reasoning_content 时不含 reasoning 字段", async () => {
        const result = await runner.run(task, agent);
        expect(result.reasoning).toBeUndefined();
    });
});
