---
name: 'db'
description: '数据库层（src/db/）编码规范，SQLite Repository 模式、schema 约束、并发安全要求。'
applyTo: 'src/db/**/*.ts'
---

# 数据库层编码规范

数据库层基于 `better-sqlite3` 实现 SQLite 持久化，采用 **Repository 模式**，每个实体对应独立的仓库类。

---

## 架构规则

### 文件职责

| 文件 | 职责 |
|------|------|
| `schema.ts` | 所有建表 DDL，只在初始化时执行一次 |
| `client.ts` | `better-sqlite3` 连接单例，WAL 模式，数据库文件路径从环境变量读取 |
| `repositories/*.ts` | 各实体的 CRUD 操作，不包含业务逻辑 |
| `index.ts` | 统一导出 `Db` 聚合对象和所有 Repository 类型 |

### 单例连接

- `client.ts` 导出唯一的 SQLite 连接实例
- 必须启用 WAL 模式（`PRAGMA journal_mode = WAL`）确保并发读安全
- 必须启用外键约束（`PRAGMA foreign_keys = ON`）

---

## Repository 编码规则

### 接口约定

每个 Repository 必须实现以下标准方法（根据实体需要选择）：

```ts
interface XxxRepository {
    save(input: CreateXxxInput): XxxRecord;
    findById(id: string): XxxRecord | undefined;
    update(input: UpdateXxxInput): XxxRecord | undefined;
    delete(id: string): boolean;
    listAll(): XxxRecord[];
}
```

### 字段命名

- DB 字段使用 `snake_case`（如 `created_at`、`agent_id`）
- TypeScript 类型使用 `camelCase`（如 `createdAt`、`agentId`）
- Repository 内部负责 `snake_case ↔ camelCase` 的转换

### JSON 字段

- 数组和对象字段存储为 JSON 字符串（如 `tags`、`depends_on`）
- 读取时必须 `JSON.parse`，写入时必须 `JSON.stringify`
- 空数组存储为 `"[]"`，不存储 `null`

---

## 并发安全

### 乐观锁（CAS 操作）

任务状态更新**必须**使用乐观锁模式，避免并发竞争：

```ts
/**
 * @function casStatus
 * @description 使用 CAS（Compare-And-Swap）原子更新任务状态
 * @param {string} id - 任务 ID
 * @param {TaskStatus} from - 期望的当前状态
 * @param {TaskStatus} to - 目标状态
 * @returns {boolean} 更新成功返回 true，状态不匹配返回 false
 */
casStatus(id: string, from: TaskStatus, to: TaskStatus): boolean {
    const result = this.#db
        .prepare("UPDATE tasks SET status = ? WHERE id = ? AND status = ?")
        .run(to, id, from);
    return result.changes > 0;
}
```

### 事务

- 批量写入必须使用 `db.transaction()` 包裹，保证原子性
- 读操作不需要事务

---

## Schema 规范

- 所有表必须有 `id TEXT PRIMARY KEY`（UUID 格式）
- 所有表必须有 `created_at TEXT NOT NULL` 和 `updated_at TEXT NOT NULL`（ISO 8601 格式）
- 外键引用必须显式声明 `REFERENCES table(id)`
- 枚举类型字段使用 `TEXT NOT NULL` 存储，不使用 CHECK 约束（保持向后兼容）

---

## 禁止事项

- ❌ 在 Repository 中编写业务逻辑（如任务调度、状态机转换）
- ❌ 在 Repository 外直接执行 SQL 语句
- ❌ 使用原始字符串拼接 SQL（必须使用参数化查询防止 SQL 注入）
- ❌ 在 `schema.ts` 外修改表结构（新增列通过 `ALTER TABLE` 迁移脚本处理）

---

## 类型映射示例

```ts
// DB 记录类型（snake_case）
interface TaskRow {
    id: string;
    board_id: string;
    title: string;
    status: string;
    assignee_id: string | null;
    depends_on: string; // JSON
    created_at: string;
    updated_at: string;
}

// 运行时类型（camelCase，来自 src/types/task.ts）
import type { Task } from "../../types/index.js";

// 转换函数
function rowToTask(row: TaskRow): Task {
    return {
        id: row.id,
        boardId: row.board_id,
        title: row.title,
        status: row.status as TaskStatus,
        assigneeId: row.assignee_id ?? undefined,
        dependsOn: JSON.parse(row.depends_on) as string[],
        // ...
    };
}
```
