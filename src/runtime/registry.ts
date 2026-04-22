/**
 * @packageDocumentation
 * @module runtime-registry
 * @since 1.0.0
 * @author zkali
 * @tags [runtime, registry, tool, skill]
 * @description 工具与技能注册表，按包名（bundle name）分组管理
 * @path src/runtime/registry.ts
 */

import type { ToolDefinition, SkillDefinition } from "../types/index.js";
import type { FunctionTool, FunctionParameters } from "../api/deepseek.js";

/**
 * @class ToolRegistry
 * @description 工具注册表，将工具包名称映射到工具定义列表
 */
export class ToolRegistry {
    readonly #bundles: Map<string, ToolDefinition[]> = new Map();

    /**
     * @function register
     * @description 注册工具包
     * @param {string} bundleName - 工具包名称（对应 Tools 契约的 name 字段）
     * @param {ToolDefinition[]} tools - 工具定义列表
     * @returns {this} 链式调用支持
     */
    register(bundleName: string, tools: ToolDefinition[]): this {
        this.#bundles.set(bundleName, tools);
        return this;
    }

    /**
     * @function getBundle
     * @description 获取指定包的工具定义列表
     * @param {string} bundleName - 工具包名称
     * @returns {ToolDefinition[]} 工具定义列表（不存在则返回空数组）
     */
    getBundle(bundleName: string): ToolDefinition[] {
        return this.#bundles.get(bundleName) ?? [];
    }

    /**
     * @function findTool
     * @description 在指定包中按名称查找工具
     * @param {string} bundleName - 工具包名称
     * @param {string} toolName - 工具名称
     * @returns {ToolDefinition | undefined} 工具定义或 undefined
     */
    findTool(bundleName: string, toolName: string): ToolDefinition | undefined {
        return this.getBundle(bundleName).find((t) => t.name === toolName);
    }

    /**
     * @function toFunctionTools
     * @description 将工具包转换为 OpenAI 兼容的 FunctionTool 数组（用于 API 调用）
     * @param {string} bundleName - 工具包名称
     * @returns {FunctionTool[]} FunctionTool 数组
     */
    toFunctionTools(bundleName: string): FunctionTool[] {
        return this.getBundle(bundleName).map((tool) => {
            const properties: Record<string, { type: string; description: string }> = {};
            for (const [key, param] of Object.entries(tool.parameters)) {
                properties[key] = { type: param.type, description: param.description };
            }
            const params: FunctionParameters = {
                type: "object" as const,
                properties,
            };
            if (tool.required && tool.required.length > 0) {
                params.required = [...tool.required];
            }
            return {
                type: "function" as const,
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: params,
                },
            };
        });
    }
}

/**
 * @class SkillRegistry
 * @description 技能注册表，将技能包名称映射到技能定义列表
 */
export class SkillRegistry {
    readonly #bundles: Map<string, SkillDefinition[]> = new Map();

    /**
     * @function register
     * @description 注册技能包
     * @param {string} bundleName - 技能包名称（对应 Skills 契约的 name 字段）
     * @param {SkillDefinition[]} skills - 技能定义列表
     * @returns {this} 链式调用支持
     */
    register(bundleName: string, skills: SkillDefinition[]): this {
        this.#bundles.set(bundleName, skills);
        return this;
    }

    /**
     * @function getBundle
     * @description 获取指定包的技能定义列表
     * @param {string} bundleName - 技能包名称
     * @returns {SkillDefinition[]} 技能定义列表（不存在则返回空数组）
     */
    getBundle(bundleName: string): SkillDefinition[] {
        return this.#bundles.get(bundleName) ?? [];
    }

    /**
     * @function findSkill
     * @description 在指定包中按名称查找技能
     * @param {string} bundleName - 技能包名称
     * @param {string} skillName - 技能名称
     * @returns {SkillDefinition | undefined} 技能定义或 undefined
     */
    findSkill(bundleName: string, skillName: string): SkillDefinition | undefined {
        return this.getBundle(bundleName).find((s) => s.name === skillName);
    }
}
