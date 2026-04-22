/**
 * @packageDocumentation
 * @module ai-env-1.0.0
 * @author zkali
 * @tags ai, config, environment, deepseek
 * @description DeepSeek API 连接参数配置
 * @path src/config/env.ts
 */

import "dotenv/config";

/**
 * @interface DeepSeekEnv
 * @description DeepSeek API 连接参数
 * @property {string} apiKey - DeepSeek API 密钥
 * @property {string} baseUrl - DeepSeek API 基础地址
 * @property {string} model - DeepSeek 模型名称，仅支持 deepseek-chat 或 deepseek-reasoner
 */
export interface DeepSeekEnv {
    apiKey: string;
    baseUrl: string;
    model: "deepseek-chat" | "deepseek-reasoner";
}

/**
 * @function loadDeepSeekEnv
 * @description 从环境变量读取并校验 DeepSeek API 连接参数
 * @returns {DeepSeekEnv} 经过校验的连接参数
 * @throws {Error} 缺少必填环境变量时抛错
 */
export function loadDeepSeekEnv(): DeepSeekEnv {
    const envSource = (globalThis as {
        process?: { env?: Record<string, string | undefined> };
    }).process?.env ?? {};

    const apiKey = envSource.DEEPSEEK_API_KEY;
    const baseUrl = envSource.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
    const model = envSource.DEEPSEEK_MODEL ?? "deepseek-chat";

    if (!apiKey) {
        throw new Error("Missing env: DEEPSEEK_API_KEY");
    }

    if (model !== "deepseek-chat" && model !== "deepseek-reasoner") {
        throw new Error("Invalid env: DEEPSEEK_MODEL must be deepseek-chat or deepseek-reasoner");
    }

    return {
        apiKey,
        baseUrl,
        model,
    };
}

