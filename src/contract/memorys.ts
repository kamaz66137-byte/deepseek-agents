/**
 * @packageDocumentation
 * @module deepseek-memory-1.0.0
 * @author zkali
 * @tags ai, contract, memory
 * @description AI 强制安全约束契约 —— 记忆契约接口定义
 * @path src/contract/memorys.ts
 */

import { type CONTRACTS } from "./contract.js";
import type { MemoryType } from "./constant/index.js";

/**
 * @interface Memorys
 * @description 记忆契约接口
 * @property {typeof CONTRACTS.MEMORYS} type - 契约类型，固定为 CONTRACTS.MEMORYS
 * @property {string} id - 记忆唯一标识
 * @property {string} name - 记忆契约名称
 * @property {string} description - 记忆契约描述
 * @property {MemoryType} scope - 记忆作用域
 * @property {string} ownerId - 记忆所属对象 ID，可对应 agent、team、user 或 global
 * @property {string} key - 记忆键
 * @property {string[]} tags - 记忆标签
 * @property {string} content - 记忆契约内容，必须遵守的规则和限制
 */
export interface Memorys {
	type: typeof CONTRACTS.MEMORYS;
	id: string;
	name: string;
	description: string;
	scope: MemoryType;
	ownerId: string;
	key: string;
	tags?: string[];
	content: string;
}
