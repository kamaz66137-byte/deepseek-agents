/**
 * @packageDocumentation
 * @module ai-api-1.0.0
 * @author zkali
 * @tags ai, config, api, deepseek
 * @description DeepSeek API 调用参数配置
 * @path src/config/api.ts
 */

import type { Agents, Docs, Memorys, Roles, Skills, Tasks, Teams, Tools } from "../contract/index.js";
import type { DeepSeekEnv } from "./env.js";

/**
 * @type Contract
 * @description 可注入的契约联合类型
 */
export type Contract = Agents | Docs | Memorys | Roles | Skills | Tasks | Teams | Tools;

/**
 * @interface DeepSeekConfig
 * @description DeepSeek 完整配置，继承连接参数并扩展调用选项
 * @property {number} [temperature] - 采样温度，范围 0-2，值越低越确定，默认 1.0
 * @property {number} [maxTokens] - 单次回复最大 token 数，默认 4096
 * @property {number} [maxInputChars] - 输入最大字符数
 * @property {Contract[]} contracts - 注入的契约列表（代理、角色、知识库、工具、技能、团队、记忆、任务）
 */
export interface DeepSeekConfig extends DeepSeekEnv {
    temperature?: number;
    maxTokens?: number;
    maxInputChars?: number;
    contracts: Contract[];
}