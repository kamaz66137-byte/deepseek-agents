/**
 * @packageDocumentation
 * @module runtime-registry
 * @since 1.0.0
 * @author zkali
 * @tags [runtime, registry, tool, skill]
 * @description 工具与技能注册表，按包名（bundle name）分组管理。
 *              支持运行时动态注册/注销，以及与数据库的双向同步（持久化与加载）。
 * @path src/runtime/registry.ts
 */

import type { ToolDefinition, SkillDefinition } from "../types/index.js";
import type { FunctionTool, FunctionParameters } from "../api/deepseek.js";
import type { ToolBundleRepository, SkillBundleRepository } from "../db/index.js";

/**
 * @class ToolRegistry
 * @description 工具注册表，将工具包名称映射到工具定义列表。
 *              支持运行时动态注册/注销，以及与数据库的双向同步。
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
     * @function unregister
     * @description 注销工具包（运行时动态卸载）
     * @param {string} bundleName - 工具包名称
     * @returns {boolean} 是否成功注销
     */
    unregister(bundleName: string): boolean {
        return this.#bundles.delete(bundleName);
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
     * @function listBundleNames
     * @description 获取所有已注册工具包名称
     * @returns {string[]} 工具包名称列表
     */
    listBundleNames(): string[] {
        return [...this.#bundles.keys()];
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

    /**
     * @function persistToDb
     * @description 将当前所有工具包持久化到数据库
     * @param {ToolBundleRepository} repo - 工具包仓库
     */
    persistToDb(repo: ToolBundleRepository): void {
        for (const [bundleName, tools] of this.#bundles) {
            repo.save(bundleName, tools);
        }
    }

    /**
     * @function loadFromDb
     * @description 从数据库加载工具包的元信息（注意：execute 函数无法持久化，需通过 execMap 补全）
     * @param {ToolBundleRepository} repo - 工具包仓库
     * @param {Record<string, (input: unknown) => Promise<unknown>>} [execMap] - 工具名称 → 执行函数的映射
     */
    loadFromDb(repo: ToolBundleRepository, execMap: Record<string, (input: unknown) => Promise<unknown>> = {}): void {
        const records = repo.listAll();
        for (const record of records) {
            const tools: ToolDefinition[] = record.tools.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                parameters: t.parameters,
                ...(t.required ? { required: t.required } : {}),
                execute: execMap[t.name] ?? ((_input: unknown) => Promise.resolve({ error: "execute not bound" })),
            }));
            this.#bundles.set(record.bundleName, tools);
        }
    }
}

/**
 * @class SkillRegistry
 * @description 技能注册表，将技能包名称映射到技能定义列表。
 *              支持运行时动态注册/注销，以及与数据库的双向同步。
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
     * @function unregister
     * @description 注销技能包（运行时动态卸载）
     * @param {string} bundleName - 技能包名称
     * @returns {boolean} 是否成功注销
     */
    unregister(bundleName: string): boolean {
        return this.#bundles.delete(bundleName);
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
     * @function listBundleNames
     * @description 获取所有已注册技能包名称
     * @returns {string[]} 技能包名称列表
     */
    listBundleNames(): string[] {
        return [...this.#bundles.keys()];
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

    /**
     * @function persistToDb
     * @description 将当前所有技能包持久化到数据库
     * @param {SkillBundleRepository} repo - 技能包仓库
     */
    persistToDb(repo: SkillBundleRepository): void {
        for (const [bundleName, skills] of this.#bundles) {
            repo.save(bundleName, skills);
        }
    }

    /**
     * @function loadFromDb
     * @description 从数据库加载技能包
     * @param {SkillBundleRepository} repo - 技能包仓库
     */
    loadFromDb(repo: SkillBundleRepository): void {
        const records = repo.listAll();
        for (const record of records) {
            const skills: SkillDefinition[] = record.skills.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                ...(s.content ? { content: s.content } : {}),
                execute: (_input: unknown) => Promise.resolve({ error: "execute not bound" }),
            }));
            this.#bundles.set(record.bundleName, skills);
        }
    }
}
