/**
 * @packageDocumentation
 * @module runtime-tool-types
 * @author zkali
 * @tags ai, runtime, tool, types
 * @description Tool 运行时类型定义，包含参数结构、工具定义与调用结果
 * @path src/types/tool.ts
 */

/**
 * @interface ToolParameter
 * @description 工具参数定义
 * @property {string} id - 参数唯一标识
 * @property {string} type - 参数类型
 * @property {string} description - 参数描述
 */
export interface ToolParameter {
    readonly id: string;
    readonly type: string;
    readonly description: string;
}

/**
 * @interface ToolDefinition
 * @description 工具运行时定义
 * @property {string} id - 工具唯一标识
 * @property {string} name - 工具名称
 * @property {string} description - 工具描述
 * @property {Record<string, ToolParameter>} parameters - 参数定义
 * @property {string[]} required - 必填参数列表
 * @property {(input: TInput) => Promise<TOutput>} execute - 工具执行函数
 */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly parameters: Readonly<Record<string, ToolParameter>>;
    readonly required?: readonly string[];
    execute(input: TInput): Promise<TOutput>;
}

/**
 * @interface ToolCall
 * @description 工具调用记录
 * @property {string} id - 调用记录唯一标识
 * @property {string} toolName - 工具名称
 * @property {unknown} input - 输入参数
 */
export interface ToolCall<TInput = unknown> {
    readonly id: string;
    readonly toolName: string;
    readonly input: TInput;
}

/**
 * @interface ToolResult
 * @description 工具调用结果
 * @property {string} id - 调用结果唯一标识
 * @property {string} toolName - 工具名称
 * @property {TOutput} [output] - 工具输出
 * @property {boolean} success - 是否成功
 * @property {string} [error] - 错误信息
 */
export interface ToolResult<TOutput = unknown> {
    readonly id: string;
    readonly toolName: string;
    readonly output?: TOutput;
    readonly success: boolean;
    readonly error?: string;
}