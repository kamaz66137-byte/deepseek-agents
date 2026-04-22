/**
 * @packageDocumentation
 * @module tests-config-env
 * @since 1.0.0
 * @author zkali
 * @tags [test, config, env]
 * @description loadDeepSeekEnv 环境变量加载与校验函数测试
 * @path src/tests/config/env.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadDeepSeekEnv } from "../../config/env.js";

/**
 * @description 保存并恢复原始环境变量的工具函数
 */
function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
    const saved: Record<string, string | undefined> = {};
    for (const key of Object.keys(vars)) {
        saved[key] = process.env[key];
        if (vars[key] === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = vars[key];
        }
    }
    try {
        fn();
    } finally {
        for (const key of Object.keys(saved)) {
            if (saved[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = saved[key];
            }
        }
    }
}

describe("loadDeepSeekEnv", () => {
    const originalApiKey = process.env["DEEPSEEK_API_KEY"];
    const originalBaseUrl = process.env["DEEPSEEK_BASE_URL"];
    const originalModel = process.env["DEEPSEEK_MODEL"];

    afterEach(() => {
        if (originalApiKey === undefined) delete process.env["DEEPSEEK_API_KEY"];
        else process.env["DEEPSEEK_API_KEY"] = originalApiKey;

        if (originalBaseUrl === undefined) delete process.env["DEEPSEEK_BASE_URL"];
        else process.env["DEEPSEEK_BASE_URL"] = originalBaseUrl;

        if (originalModel === undefined) delete process.env["DEEPSEEK_MODEL"];
        else process.env["DEEPSEEK_MODEL"] = originalModel;
    });

    it("缺少 DEEPSEEK_API_KEY 时抛出错误", () => {
        withEnv({ DEEPSEEK_API_KEY: undefined, DEEPSEEK_BASE_URL: undefined, DEEPSEEK_MODEL: undefined }, () => {
            expect(() => loadDeepSeekEnv()).toThrow("Missing env: DEEPSEEK_API_KEY");
        });
    });

    it("DEEPSEEK_API_KEY 为有效值时成功返回配置", () => {
        withEnv({ DEEPSEEK_API_KEY: "sk-test-key", DEEPSEEK_BASE_URL: undefined, DEEPSEEK_MODEL: undefined }, () => {
            const env = loadDeepSeekEnv();
            expect(env.apiKey).toBe("sk-test-key");
            expect(env.baseUrl).toBe("https://api.deepseek.com");
            expect(env.model).toBe("deepseek-chat");
        });
    });

    it("自定义 DEEPSEEK_BASE_URL 生效", () => {
        withEnv({ DEEPSEEK_API_KEY: "sk-test", DEEPSEEK_BASE_URL: "https://custom.api.com", DEEPSEEK_MODEL: undefined }, () => {
            const env = loadDeepSeekEnv();
            expect(env.baseUrl).toBe("https://custom.api.com");
        });
    });

    it("DEEPSEEK_MODEL=deepseek-reasoner 时返回 deepseek-reasoner", () => {
        withEnv({ DEEPSEEK_API_KEY: "sk-test", DEEPSEEK_BASE_URL: undefined, DEEPSEEK_MODEL: "deepseek-reasoner" }, () => {
            const env = loadDeepSeekEnv();
            expect(env.model).toBe("deepseek-reasoner");
        });
    });

    it("DEEPSEEK_MODEL=deepseek-chat 时返回 deepseek-chat", () => {
        withEnv({ DEEPSEEK_API_KEY: "sk-test", DEEPSEEK_BASE_URL: undefined, DEEPSEEK_MODEL: "deepseek-chat" }, () => {
            const env = loadDeepSeekEnv();
            expect(env.model).toBe("deepseek-chat");
        });
    });

    it("DEEPSEEK_MODEL 为无效值时抛出错误", () => {
        withEnv({ DEEPSEEK_API_KEY: "sk-test", DEEPSEEK_BASE_URL: undefined, DEEPSEEK_MODEL: "gpt-4" }, () => {
            expect(() => loadDeepSeekEnv()).toThrow(
                "Invalid env: DEEPSEEK_MODEL must be deepseek-chat or deepseek-reasoner",
            );
        });
    });
});
