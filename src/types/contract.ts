/**
 * @packageDocumentation
 * @module runtime-contract-types
 * @author zkali
 * @tags ai, runtime, contract, types
 * @description Contract 管理类型定义，包含统一查询与列表结果结构
 * @path src/types/contract.ts
 */

import type { ContractType, Agents, Docs, Memorys, Roles, Skills, Tasks, Teams, Tools } from "../contract/index.js";

/**
 * @type ContractEntity
 * @description 可管理契约实体联合类型
 */
export type ContractEntity = Agents | Docs | Memorys | Roles | Skills | Tasks | Teams | Tools;

/**
 * @interface ContractRef
 * @description 契约引用
 * @property {string} id - 契约引用唯一标识
 * @property {ContractType} type - 契约类型
 * @property {string} name - 契约名称
 * @property {string} [alias] - 契约别名
 */
export interface ContractRef {
    readonly id: string;
    readonly type: ContractType;
    readonly name: string;
    readonly alias?: string;
}

/**
 * @interface QueryContractInput
 * @description 契约查询输入
 * @property {string} id - 查询请求唯一标识
 * @property {ContractType} [type] - 契约类型过滤
 * @property {string} [name] - 契约名称过滤
 * @property {string} [alias] - 契约别名过滤
 * @property {string} [keyword] - 关键字搜索
 */
export interface QueryContractInput {
    readonly id: string;
    readonly type?: ContractType;
    readonly name?: string;
    readonly alias?: string;
    readonly keyword?: string;
}

/**
 * @interface ContractListResult
 * @description 契约列表结果
 * @property {string} id - 结果集唯一标识
 * @property {T[]} items - 契约结果列表
 * @property {number} total - 结果总数
 */
export interface ContractListResult<T extends ContractEntity = ContractEntity> {
    readonly id: string;
    readonly items: readonly T[];
    readonly total: number;
}