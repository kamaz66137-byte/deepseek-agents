/**
 * @packageDocumentation
 * @module api-server
 * @since 1.0.0
 * @author zkali
 * @tags [api, http, rest, server]
 * @description HTTP REST API 服务，基于 Node.js 内置 http 模块，无需额外依赖。
 *              暴露以下端点：
 *              - POST /boards — 创建看板并启动多代理任务
 *              - GET  /tasks/:id — 查询任务状态
 *              - GET  /memory/:agentId — 读取代理记忆
 * @path src/api/server.ts
 */

import http from "http";
import type { IncomingMessage, ServerResponse } from "http";
import type { Db } from "../db/index.js";
import type { BoardRunner } from "../runtime/board-runner.js";
import { MemoryScope } from "../types/index.js";

// ─────────────────────────────── 类型定义 ───────────────────────────────

/**
 * @interface ApiServerOptions
 * @description HTTP API 服务器初始化选项
 * @property {Db} db - 数据库访问对象
 * @property {BoardRunner} boardRunner - 看板编排器
 * @property {number} [port] - 监听端口（默认 3000）
 * @property {string} [host] - 监听主机（默认 127.0.0.1）
 */
export interface ApiServerOptions {
    readonly db: Db;
    readonly boardRunner: BoardRunner;
    readonly port?: number;
    readonly host?: string;
}

/**
 * @interface ApiServer
 * @description HTTP API 服务器实例
 */
export interface ApiServer {
    /**
     * @function start
     * @async
     * @description 启动 HTTP 服务
     * @returns {Promise<void>}
     */
    start(): Promise<void>;

    /**
     * @function stop
     * @async
     * @description 停止 HTTP 服务
     * @returns {Promise<void>}
     */
    stop(): Promise<void>;

    /**
     * @function getAddress
     * @description 获取服务监听地址
     * @returns {string} 监听地址（如 http://127.0.0.1:3000）
     */
    getAddress(): string;
}

// ─────────────────────────────── 常量 ───────────────────────────────

/**
 * @const MAX_REQUEST_BODY_BYTES
 * @description HTTP 请求体大小上限（1 MB），防止内存耗尽攻击
 */
const MAX_REQUEST_BODY_BYTES = 1_048_576; // 1 MB

// ─────────────────────────────── 辅助函数 ───────────────────────────────

/**
 * @function readBody
 * @async
 * @description 读取请求体并解析为对象（限制 1 MB 大小）
 * @param {IncomingMessage} req - 请求对象
 * @returns {Promise<unknown>} 解析后的对象
 * @throws {Error} JSON 解析失败或超出大小限制
 */
async function readBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
        let raw = "";
        let byteLength = 0;
        req.on("data", (chunk: Buffer) => {
            byteLength += chunk.byteLength;
            if (byteLength > MAX_REQUEST_BODY_BYTES) {
                reject(new Error("请求体超过 1 MB 大小限制"));
                req.destroy();
                return;
            }
            raw += chunk.toString("utf8");
        });
        req.on("end", () => {
            if (!raw.trim()) { resolve({}); return; }
            try { resolve(JSON.parse(raw)); }
            catch (err) { reject(err); }
        });
        req.on("error", reject);
    });
}

/**
 * @function sendJson
 * @description 发送 JSON 响应
 * @param {ServerResponse} res - 响应对象
 * @param {number} statusCode - HTTP 状态码
 * @param {unknown} data - 响应数据
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
    const body = JSON.stringify(data);
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
}

/**
 * @function sendError
 * @description 发送错误 JSON 响应
 * @param {ServerResponse} res - 响应对象
 * @param {number} statusCode - HTTP 状态码
 * @param {string} message - 错误信息
 */
function sendError(res: ServerResponse, statusCode: number, message: string): void {
    sendJson(res, statusCode, { error: message });
}

/**
 * @function extractPathParam
 * @description 从 URL 路径中提取参数（简单单参数路由匹配）
 * @param {string} pathname - 请求路径
 * @param {string} prefix - 路由前缀（如 "/tasks/"）
 * @returns {string | null} 参数值或 null
 */
function extractPathParam(pathname: string, prefix: string): string | null {
    if (!pathname.startsWith(prefix)) return null;
    const param = pathname.slice(prefix.length);
    return param.length > 0 ? decodeURIComponent(param) : null;
}

// ─────────────────────────────── 工厂函数 ───────────────────────────────

/**
 * @function createApiServer
 * @description 创建并返回 HTTP API 服务器实例
 * @param {ApiServerOptions} options - 服务器选项
 * @returns {ApiServer} 服务器实例
 */
export function createApiServer(options: ApiServerOptions): ApiServer {
    const { db, boardRunner, port = 3000, host = "127.0.0.1" } = options;

    /**
     * @function handleRequest
     * @async
     * @description 请求路由分发
     * @param {IncomingMessage} req - 请求对象
     * @param {ServerResponse} res - 响应对象
     */
    async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const method = req.method?.toUpperCase() ?? "GET";
        const pathname = (req.url ?? "/").split("?")[0] ?? "/";

        try {
            // POST /boards — 创建看板并启动多代理任务
            if (method === "POST" && pathname === "/boards") {
                const body = await readBody(req) as { objective?: string };
                const objective = body.objective;
                if (typeof objective !== "string" || !objective.trim()) {
                    sendError(res, 400, "请求体缺少 objective 字段");
                    return;
                }

                // 异步启动看板，立即返回
                const boardId = await startBoardAsync(objective);
                sendJson(res, 202, {
                    boardId,
                    status: "started",
                    message: "看板已启动，使用 GET /tasks/:id 查询任务状态",
                });
                return;
            }

            // GET /tasks/:id — 查询任务状态
            const taskId = extractPathParam(pathname, "/tasks/");
            if (method === "GET" && taskId !== null) {
                const task = db.tasks.findById(taskId);
                if (!task) { sendError(res, 404, `任务 ${taskId} 不存在`); return; }
                sendJson(res, 200, {
                    id: task.id,
                    title: task.title,
                    status: task.status,
                    boardId: task.boardId,
                    assigneeId: task.assigneeId,
                    priority: task.priority,
                    timeout: task.timeout,
                    retryLimit: task.retryLimit,
                    retryCount: task.retryCount,
                    content: task.content,
                    createdAt: task.createdAt.toISOString(),
                    updatedAt: task.updatedAt.toISOString(),
                });
                return;
            }

            // GET /memory/:agentId — 读取代理记忆
            const agentId = extractPathParam(pathname, "/memory/");
            if (method === "GET" && agentId !== null) {
                const result = db.memories.query({ id: agentId, scope: MemoryScope.AGENT, ownerId: agentId });
                sendJson(res, 200, {
                    agentId,
                    total: result.total,
                    items: result.items.map((e) => ({
                        key: e.key,
                        value: e.value,
                        tags: e.tags,
                        updatedAt: e.updatedAt.toISOString(),
                    })),
                });
                return;
            }

            // 404
            sendError(res, 404, `路由 ${method} ${pathname} 不存在`);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            sendError(res, 500, `服务器内部错误: ${message}`);
        }
    }

    /**
     * @function startBoardAsync
     * @async
     * @description 异步启动看板任务（非阻塞），通过事件总线捕获真实 boardId 后返回
     * @param {string} objective - 用户目标
     * @returns {Promise<string>} 真实 boardId（由 board:started 事件提供）
     */
    async function startBoardAsync(objective: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            // 通过事件总线监听 board:started 事件，获取真实 boardId
            const unsubscribe = boardRunner.events.once("board:started", (event) => {
                resolve(event.boardId);
            });

            boardRunner.run(objective).catch((err) => {
                unsubscribe();
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[ApiServer] 看板执行失败: ${msg}`);
                // 如果 board:started 事件还未触发，拒绝 Promise
                reject(new Error(msg));
            });
        });
    }

    const server = http.createServer((req, res) => {
        handleRequest(req, res).catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            if (!res.headersSent) {
                sendError(res, 500, `未处理异常: ${message}`);
            }
        });
    });

    return {
        start(): Promise<void> {
            return new Promise((resolve, reject) => {
                server.on("error", reject);
                server.listen(port, host, () => resolve());
            });
        },

        stop(): Promise<void> {
            return new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        },

        getAddress(): string {
            return `http://${host}:${port}`;
        },
    };
}
