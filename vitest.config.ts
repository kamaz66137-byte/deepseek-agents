/**
 * @packageDocumentation
 * @module vitest-config
 * @since 1.0.0
 * @author zkali
 * @tags [test, vitest, config]
 * @description Vitest 测试运行器配置
 * @path vitest.config.ts
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["src/tests/**/*.test.ts"],
        globals: false,
    },
    resolve: {
        conditions: ["node", "import", "module"],
    },
});
