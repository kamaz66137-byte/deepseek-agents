/**
 * @packageDocumentation
 * @module runtime-skill-types
 * @author zkali
 * @tags ai, runtime, skill, types
 * @description Skill 运行时类型定义，包含技能定义与执行结果
 * @path src/types/skill.ts
 */

/**
 * @interface SkillDefinition
 * @description 技能运行时定义
 * @property {string} id - 技能唯一标识
 * @property {string} name - 技能名称
 * @property {string} description - 技能描述
 * @property {(input: TInput) => Promise<TOutput>} execute - 技能执行函数
 */
export interface SkillDefinition<TInput = unknown, TOutput = unknown> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    execute(input: TInput): Promise<TOutput>;
}

/**
 * @interface SkillResult
 * @description 技能执行结果
 * @property {string} id - 执行结果唯一标识
 * @property {string} skillName - 技能名称
 * @property {TOutput} [output] - 技能输出
 * @property {boolean} success - 是否成功
 * @property {string} [error] - 错误信息
 */
export interface SkillResult<TOutput = unknown> {
    readonly id: string;
    readonly skillName: string;
    readonly output?: TOutput;
    readonly success: boolean;
    readonly error?: string;
}