/**
 * @packageDocumentation
 * @module runtime-agent-types
 * @author zkali
 * @tags ai, runtime, agent, types
 * @description Agent 运行时类型定义，包含执行配置、消息结构与团队配置
 * @path src/types/agent.ts
 */

/**
 * @const AgentMode
 * @description Agent 推理模式
 * @property {string} THINKING - 开启推理模式
 * @property {string} NON_THINKING - 关闭推理模式
 */
export const AgentMode = {
    THINKING: "thinking",
    NON_THINKING: "non-thinking",
} as const;

export type AgentMode = typeof AgentMode[keyof typeof AgentMode];

/**
 * @interface AgentConfig
 * @description Agent 运行配置
 * @property {string} id - Agent 唯一标识
 * @property {string} name - Agent 名称
 * @property {string} systemPrompt - 系统提示词
 * @property {AgentMode} mode - Agent 推理模式
 * @property {string[]} toolNames - 允许使用的工具名称列表
 * @property {string[]} skillNames - 允许使用的技能名称列表
 */
export interface AgentConfig {
    readonly id: string;
    readonly name: string;
    readonly systemPrompt: string;
    readonly mode: AgentMode;
    readonly toolNames: readonly string[];
    readonly skillNames: readonly string[];
}

/**
 * @interface AgentMessage
 * @description Agent 对话消息结构
 * @property {string} id - 消息唯一标识
 * @property {"system" | "user" | "assistant" | "tool"} role - 消息角色
 * @property {string} content - 消息内容
 * @property {string} [toolCallId] - 工具调用 ID
 * @property {string} [name] - 发送方名称
 */
export interface AgentMessage {
    readonly id: string;
    readonly role: "system" | "user" | "assistant" | "tool";
    readonly content: string;
    readonly toolCallId?: string;
    readonly name?: string;
}

/**
 * @interface AgentRunInput
 * @description Agent 执行输入
 * @property {string} id - 执行请求唯一标识
 * @property {string} agentId - Agent ID
 * @property {string} userId - 用户 ID
 * @property {string} message - 用户输入消息
 * @property {AgentMessage[]} [history] - 历史消息
 */
export interface AgentRunInput {
    readonly id: string;
    readonly agentId: string;
    readonly userId: string;
    readonly message: string;
    readonly history?: readonly AgentMessage[];
}

/**
 * @interface AgentRunResult
 * @description Agent 执行结果
 * @property {string} id - 执行结果唯一标识
 * @property {string} agentId - Agent ID
 * @property {string} content - 回复内容
 * @property {string} [reasoning] - 推理摘要
 * @property {AgentMessage[]} messages - 产出的消息列表
 */
export interface AgentRunResult {
    readonly id: string;
    readonly agentId: string;
    readonly content: string;
    readonly reasoning?: string;
    readonly messages: readonly AgentMessage[];
}

/**
 * @interface TeamConfig
 * @description 团队运行配置
 * @property {string} id - 团队 ID
 * @property {string} name - 团队名称
 * @property {string[]} agentIds - 团队成员 Agent ID 列表
 * @property {string} [coordinatorId] - 协调 Agent ID
 */
export interface TeamConfig {
    readonly id: string;
    readonly name: string;
    readonly agentIds: readonly string[];
    readonly coordinatorId?: string;
}