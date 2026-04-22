
/**
 * @packageDocumentation
 * @module deepseek-ai-tools-1.0.0
 * @author zkali
 * @tags ai, contract, safety, constraints
 * @description AI 强制安全约束契约 —— 硬编码，不可通过外部配置覆盖或关闭
 * @path src/ai/contract/tools.ts
 */

import { type CONTRACTS } from "./contract.js";



/**
 * @const TOOLS_FIELDS
 * @description 工具集契约字段常量集合
 * @type {Object}  
 * @property {string} STRING - 字符串类型工具契约
 * @property {number} NUMBER - 数字类型工具契约
 * @property {boolean} BOOLEAN - 布尔类型工具契约
 * @property {string[]} STRING_ARRAY - 字符串数组类型工具契约
 * @property {Object} OBJECT - 对象类型工具契约，必须是一个键值对对象，键为工具名称，值为工具描述或配置
*/

/**
 * @interface Tools
 * @description 工具集契约接口
 * @property {typeof CONTRACTS.TOOLS} type - 契约类型，固定为 CONTRACTS.TOOLS
 * @property {string} id - id
 * @property {string} name - 工具集契约名称，
 * @property {string} alias - 工具集契约别名，UI展示使用，必须是一个合法的标识符，且在同一团队内唯一
 * @property {string} description - 工具集契约描述，
 * @property {string} content - 工具集契约内容，必须遵守的规则和限制
*/
export interface Tools {
    type: typeof CONTRACTS.TOOLS;
    id: string;
    name: string;
    alias: string;
    description: string ;
    content: string;
}