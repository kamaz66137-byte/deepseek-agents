/**
 * @packageDocumentation
 * @module memory-types
 * @since 0.1.0 (2026-04-18)
 * @author zkali
 * @tags [agents, memory, types]
 * @description Memory 管理类型定义
 */

/**
 * @const MemoryType
 * @description 记忆类型
 * @property {string} AGENT - Agent 私有记忆
 * @property {string} TEAM - 团队共享记忆
 * @property {string} USER - 用户级别记忆
 * @property {string} GLOBAL - 全局共享记忆
 * @property {string} SEMANTIC - 语义记忆（支持关键词/语义搜索）
 */
export const MemoryType = {
  AGENT: 'agent',
  TEAM: 'team',
  USER: 'user',
  GLOBAL: 'global',
  SEMANTIC: 'semantic',
} as const;

export type MemoryType = (typeof MemoryType)[keyof typeof MemoryType];