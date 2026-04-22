---
name: 'comment-instructions'
description: '在编写 TypeScript 代码时使用。涵盖文件头部注释、接口、函数、类、常量严格标准。'
applyTo: '**/*.ts'
---

# 代码注释标准

## 文件头部注释（必须）

```ts
/**
 * @packageDocumentation
 * @module 模块名 xx-xxx
 * @since 版本 1.0.0 不变
 * @author zkali
 * @tags [标签]
 * @description 文件功能描述
 * @path 文件路径（相对于项目根目录）
 */
```

## 接口/类型定义

```ts
/**
 * @interface CreateUserInput
 * @description 创建用户输入参数
 * @property {string} username - 用户名
 * @property {string} email - 邮箱
 * @property {string} password - 密码
 */
export interface CreateUserInput {
  readonly username: string;
  readonly email: string;
  readonly password: string;
}
```

## 常量/枚举

```ts
/**
 * @const UserStatus
 * @description 用户状态
 * @property {string} ACTIVE - 正常
 * @property {string} DISABLED - 禁用
 */
export const UserStatus = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED'
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
```

## 函数/方法

```ts
/**
 * @function createUser
 * @async
 * @description 创建用户
 * @param {CreateUserInput} input - 用户输入
 * @returns {Promise<User>} 创建的用户
 * @throws {ValidationError} 输入验证失败
 * @throws {DuplicateError} 用户已存在
 * @internal 仅内部使用时标记
 */
export const createUser = async (input: CreateUserInput): Promise<User> => {
  // 实现
};
```
 

## 模块导出（index.ts）

仅导出公开 API，不导出内部函数：

```ts
// ✅ 正确
export { UserService } from './service';
export type { CreateUserInput } from './types';

// ❌ 错误 - 暴露内部实现
export * from './service';
export { validateUserInput } from './service';
```

## 规则

| 项目 | 要求 |
|------|------|
| **文件头部** | 必填 @packageDocumentation、@module、@description |
| **函数** | @param、@returns、@throws 必填 |
| **异步** | 必标记 @async |
| **内部** | 标记 @internal，不导出 |
| **语言** | 所有注释统一中文 |
| **类型** | 所有参数需类型和说明 |
 