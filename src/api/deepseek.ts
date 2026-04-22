/**
 * @packageDocumentation
 * @module api-deepseek
 * @since 1.0.0
 * @author zkali
 * @tags [api, deepseek, http]
 * @description DeepSeek API HTTP 客户端，支持 Chat Completion 与 Function Calling
 * @path src/api/deepseek.ts
 */

import axios from "axios";
import type { AxiosInstance } from "axios";
import type { DeepSeekEnv } from "../config/env.js";

/**
 * @interface ChatMessage
 * @description DeepSeek API 消息结构
 * @property {"system" | "user" | "assistant" | "tool"} role - 消息角色
 * @property {string | null} content - 消息内容
 * @property {string} [tool_call_id] - 工具调用 ID（role=tool 时必填）
 * @property {string} [name] - 工具名称（role=tool 时）
 * @property {ToolCallResponse[]} [tool_calls] - 工具调用列表（role=assistant 时）
 */
export interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_call_id?: string;
    name?: string;
    tool_calls?: ToolCallResponse[];
}

/**
 * @interface ToolCallResponse
 * @description 工具调用响应结构
 * @property {string} id - 调用 ID
 * @property {"function"} type - 类型，固定为 function
 * @property {{ name: string; arguments: string }} function - 函数调用信息
 */
export interface ToolCallResponse {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

/**
 * @interface FunctionTool
 * @description OpenAI 兼容的工具定义结构
 * @property {"function"} type - 固定为 function
 * @property {{ name: string; description: string; parameters: FunctionParameters }} function - 函数定义
 */
export interface FunctionTool {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: FunctionParameters;
    };
}

/**
 * @interface FunctionParameters
 * @description JSON Schema 参数定义
 * @property {"object"} type - 固定为 object
 * @property {Record<string, { type: string; description: string }>} properties - 参数属性
 * @property {string[]} [required] - 必填参数列表
 */
export interface FunctionParameters {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
}

/**
 * @interface ChatCompletionRequest
 * @description Chat Completion 请求体
 * @property {string} model - 模型名称
 * @property {ChatMessage[]} messages - 消息列表
 * @property {number} [temperature] - 采样温度
 * @property {number} [max_tokens] - 最大 token 数
 * @property {FunctionTool[]} [tools] - 可用工具列表
 * @property {"auto" | "none"} [tool_choice] - 工具调用策略
 */
export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    tools?: FunctionTool[];
    tool_choice?: "auto" | "none";
}

/**
 * @interface ChatCompletionChoice
 * @description 单条 completion 候选
 * @property {{ role: "assistant"; content: string | null; reasoning_content?: string; tool_calls?: ToolCallResponse[] }} message - 消息内容
 * @property {"stop" | "tool_calls" | "length"} finish_reason - 结束原因
 */
export interface ChatCompletionChoice {
    message: {
        role: "assistant";
        content: string | null;
        reasoning_content?: string;
        tool_calls?: ToolCallResponse[];
    };
    finish_reason: "stop" | "tool_calls" | "length";
}

/**
 * @interface ChatCompletionResponse
 * @description Chat Completion 响应体
 * @property {string} id - 响应 ID
 * @property {ChatCompletionChoice[]} choices - 候选列表
 * @property {{ prompt_tokens: number; completion_tokens: number; total_tokens: number }} usage - Token 用量
 */
export interface ChatCompletionResponse {
    id: string;
    choices: ChatCompletionChoice[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * @class DeepSeekApiError
 * @description DeepSeek API 调用错误
 * @property {number} statusCode - HTTP 状态码
 * @property {string} message - 错误信息
 */
export class DeepSeekApiError extends Error {
    /**
     * @constructor
     * @param {number} statusCode - HTTP 状态码
     * @param {string} message - 错误信息
     */
    constructor(public readonly statusCode: number, message: string) {
        super(message);
        this.name = "DeepSeekApiError";
    }
}

/**
 * @interface DeepSeekClient
 * @description DeepSeek API 客户端接口
 */
export interface DeepSeekClient {
    /**
     * @function chatCompletion
     * @async
     * @description 调用 DeepSeek Chat Completion 接口
     * @param {ChatCompletionRequest} req - 请求体
     * @returns {Promise<ChatCompletionResponse>} 响应体
     * @throws {DeepSeekApiError} API 调用失败
     */
    chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse>;
}

/**
 * @function createDeepSeekClient
 * @description 创建 DeepSeek API 客户端（内置重试机制）
 * @param {DeepSeekEnv} env - API 连接参数
 * @param {number} [maxRetries=3] - 最大重试次数
 * @returns {DeepSeekClient} 客户端实例
 */
export function createDeepSeekClient(env: DeepSeekEnv, maxRetries = 3): DeepSeekClient {
    const http: AxiosInstance = axios.create({
        baseURL: env.baseUrl,
        headers: {
            Authorization: `Bearer ${env.apiKey}`,
            "Content-Type": "application/json",
        },
        timeout: 120_000,
    });

    async function chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        let lastError: unknown;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await http.post<ChatCompletionResponse>("/chat/completions", req);
                return response.data;
            } catch (err) {
                lastError = err;
                if (axios.isAxiosError(err)) {
                    const status = err.response?.status ?? 0;
                    // 速率限制或服务端错误时重试（指数退避）
                    if (status === 429 || status >= 500) {
                        const delay = Math.pow(2, attempt) * 1000;
                        await new Promise((r) => setTimeout(r, delay));
                        continue;
                    }
                    const message = (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message ?? err.message;
                    throw new DeepSeekApiError(status, message);
                }
                throw err;
            }
        }
        if (axios.isAxiosError(lastError)) {
            const status = lastError.response?.status ?? 0;
            const message = (lastError.response?.data as { error?: { message?: string } } | undefined)?.error?.message ?? lastError.message;
            throw new DeepSeekApiError(status, `Max retries exceeded: ${message}`);
        }
        throw lastError;
    }

    return { chatCompletion };
}
