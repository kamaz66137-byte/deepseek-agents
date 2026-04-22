
/**
 * @packageDocumentation
 * @module deepseek-agents-docs-1.0.0
 * @author zkali
 * @tags ai, contract, safety, constraints
 * @description AI 强制安全约束契约 —— 硬编码，不可通过外部配置覆盖或关闭
 * @path src/ai/contract/agents.ts
 */

import { type CONTRACTS } from "./contract.js";
import type { Teams } from "./teams.js";
import type { Tools } from "./tools.js";
import type { Skills } from "./skills.js";
import type { Docs } from "./docs.js";
import type {Memorys} from "./memorys.js";
import type { TeamRoleType } from "./constant/index.js";

import type { DeepSeekConfig } from "../config/api.js";


/**
 * @interface Agents
 * @description 代理契约接口
 * @property {string} id - id
 * @property {string} teams - 代理团队归属关联teams契约，必须是一个合法的团队名称，且在同一团队内唯一
 * @property {string} name - 代理契约名称，
 * @property {string} alias - 代理契约别名，UI展示使用，必须是一个合法的标识符，且在同一团队内唯一
 * @property {string} description - 代理契约描述，
 * @property {DeepSeekConfig["model"]} deepseekModel - 代理契约绑定的 DeepSeek 模型
 * @property {DeepSeekConfig["temperature"]} temperature - 代理契约绑定的采样温度
 * @property {Teams} teams - 代理团队归属关联teams契约，必须是一个合法的团队名称，且在同一团队内唯一
 * @property {TeamRoleType} role - 代理团队角色，必须引用 TeamRole 常量定义
 * @property {Tools} tools - 代理关联的工具集契约
 * @property {Skills} skills - 代理关联skills契约
 * @property {Memorys} memory - 代理契约内存，必须遵守的规则和限制
 * @property {Docs} docs - 代理关联的知识库契约
 * @property {string} prompt - 代理契约内容，必须遵守的规则和限制
 */
export interface Agents {
    type: typeof CONTRACTS.AGENTS;
    id: string;
    name: string;
    alias: string;
    description: string;
    deepseekModel: DeepSeekConfig["model"];
    temperature?: DeepSeekConfig["temperature"];
    tools: Tools;
    skills: Skills;
    memory: Memorys;
    docs: Docs;
    teams: Teams;
    role: TeamRoleType;
    prompt: string;
}