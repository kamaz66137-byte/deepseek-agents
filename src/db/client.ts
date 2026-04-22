/**
 * @packageDocumentation
 * @module db-client
 * @since 1.0.0
 * @author zkali
 * @tags [db, sqlite, client]
 * @description better-sqlite3 数据库连接单例工厂
 * @path src/db/client.ts
 */

import Database from "better-sqlite3";
import { CREATE_TABLES_SQL, MIGRATE_SQL_STATEMENTS } from "./schema.js";

/**
 * @function createDbClient
 * @description 创建并初始化 SQLite 数据库连接，执行建表语句及安全迁移
 * @param {string} [dbPath=":memory:"] - 数据库文件路径，默认内存数据库
 * @returns {Database.Database} 已初始化的 better-sqlite3 实例
 */
export function createDbClient(dbPath: string = ":memory:"): Database.Database {
    const db = new Database(dbPath);
    db.exec(CREATE_TABLES_SQL);
    // 安全执行迁移语句：仅忽略"duplicate column"错误（已有数据库的列补全），其他错误继续抛出
    for (const sql of MIGRATE_SQL_STATEMENTS) {
        try {
            db.exec(sql);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.toLowerCase().includes("duplicate column")) {
                throw err;
            }
            // duplicate column name — already migrated, skip
        }
    }
    return db;
}
