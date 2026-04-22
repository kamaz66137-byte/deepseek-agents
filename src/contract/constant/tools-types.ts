/**
 * @packageDocumentation
 * @module constant-tools-types
 * @author zkali
 * @tags ai, contract, tools, constant
 * @description 工具分类常量定义
 * @path src/contract/constant/tools-types.ts
 */

/**
 * @const ToolsType
 * @description 工具类型常量
 * @property {string} SEARCH - 检索工具
 * @property {string} READ - 读取工具
 * @property {string} WRITE - 写入工具
 * @property {string} EXECUTE - 执行工具
 * @property {string} NETWORK - 网络工具
 */
export const ToolsType = {
    SEARCH: "search",
    READ: "read",
    WRITE: "write",
    EXECUTE: "execute",
    NETWORK: "network",
} as const;

export type ToolsType = typeof ToolsType[keyof typeof ToolsType];