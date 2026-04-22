/**
 * @packageDocumentation
 * @module db-schema
 * @since 1.0.0
 * @author zkali
 * @tags [db, sqlite, schema]
 * @description SQLite 数据库表结构定义与行类型
 * @path src/db/schema.ts
 */

/**
 * @const CREATE_TABLES_SQL
 * @description 初始化所有表的 DDL 语句，启用 WAL 模式和外键约束
 */
export const CREATE_TABLES_SQL = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;


CREATE TABLE IF NOT EXISTS teams (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  logo        TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  agents_json TEXT NOT NULL DEFAULT '[]',
  tags        TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  id              TEXT PRIMARY KEY,
  team_id         TEXT NOT NULL REFERENCES teams(id),
  name            TEXT NOT NULL,
  alias           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  role            TEXT NOT NULL,
  deepseek_model  TEXT NOT NULL,
  temperature     REAL,
  prompt          TEXT NOT NULL DEFAULT '',
  tool_bundle     TEXT NOT NULL DEFAULT '',
  skill_bundle    TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS boards (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  team_id     TEXT REFERENCES teams(id),
  agent_id    TEXT NOT NULL REFERENCES agents(id),
  objective   TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  board_id    TEXT NOT NULL REFERENCES boards(id),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  assignee_id TEXT REFERENCES agents(id),
  team_id     TEXT REFERENCES teams(id),
  depends_on  TEXT NOT NULL DEFAULT '[]',
  content     TEXT,
  priority    INTEGER NOT NULL DEFAULT 0,
  timeout     INTEGER,
  retry_limit INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_bundles (
  id          TEXT PRIMARY KEY,
  bundle_name TEXT NOT NULL UNIQUE,
  tools_json  TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_bundles (
  id          TEXT PRIMARY KEY,
  bundle_name TEXT NOT NULL UNIQUE,
  skills_json TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memories (
  id          TEXT PRIMARY KEY,
  scope       TEXT NOT NULL,
  owner_id    TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  tags        TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE(scope, owner_id, key)
);

CREATE TABLE IF NOT EXISTS messages (
  id           TEXT PRIMARY KEY,
  agent_id     TEXT NOT NULL,
  task_id      TEXT,
  role         TEXT NOT NULL,
  content      TEXT NOT NULL,
  tool_call_id TEXT,
  msg_name     TEXT,
  created_at   TEXT NOT NULL
);
`;

/**
 * @const MIGRATE_SQL_STATEMENTS
 * @description 向已有数据库安全追加新列的迁移语句（每条独立执行，忽略 "duplicate column" 错误）
 */
export const MIGRATE_SQL_STATEMENTS: readonly string[] = [
    `ALTER TABLE tasks ADD COLUMN priority    INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE tasks ADD COLUMN timeout     INTEGER`,
    `ALTER TABLE tasks ADD COLUMN retry_limit INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE tasks ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0`,
];

/**
 * @interface TeamRow
 * @description SQLite teams 表行结构
 * @property {string} id - 主键
 * @property {string} name - 名称
 * @property {string} description - 描述
 * @property {string} logo - 徽标 URL
 * @property {string} content - 内容
 * @property {string} tags - JSON 数组字符串
 * @property {string} created_at - ISO 时间字符串
 * @property {string} updated_at - ISO 时间字符串
 */
export interface TeamRow {
    id: string;
    name: string;
    description: string;
    logo: string;
    content: string;
    agents_json: string;
    tags: string;
    created_at: string;
    updated_at: string;
}

/**
 * @interface AgentRow
 * @description SQLite agents 表行结构
 * @property {string} id - 主键
 * @property {string} team_id - 归属团队 ID
 * @property {string} name - 代理名称
 * @property {string} alias - 代理别名
 * @property {string} description - 描述
 * @property {string} role - 团队角色（plan | implement | acceptance | review）
 * @property {string} deepseek_model - 绑定模型
 * @property {number | null} temperature - 采样温度
 * @property {string} prompt - 系统提示词
 * @property {string} tool_bundle - 工具包名称（对应 ToolRegistry 键）
 * @property {string} skill_bundle - 技能包名称（对应 SkillRegistry 键）
 * @property {string} created_at - ISO 时间字符串
 * @property {string} updated_at - ISO 时间字符串
 */
export interface AgentRow {
    id: string;
    team_id: string;
    name: string;
    alias: string;
    description: string;
    role: string;
    deepseek_model: string;
    temperature: number | null;
    prompt: string;
    tool_bundle: string;
    skill_bundle: string;
    created_at: string;
    updated_at: string;
}

/**
 * @interface BoardRow
 * @description SQLite boards 表行结构
 * @property {string} id - 主键
 * @property {string} name - 看板名称
 * @property {string | null} team_id - 归属团队 ID
 * @property {string} agent_id - 创建者（plan agent）ID
 * @property {string} objective - 用户原始目标
 * @property {string} created_at - ISO 时间字符串
 */
export interface BoardRow {
    id: string;
    name: string;
    team_id: string | null;
    agent_id: string;
    objective: string;
    created_at: string;
}

/**
 * @interface TaskRow
 * @description SQLite tasks 表行结构
 * @property {string} id - 主键
 * @property {string} board_id - 归属看板 ID
 * @property {string} title - 任务标题
 * @property {string} description - 任务描述
 * @property {string} status - 任务状态
 * @property {string | null} assignee_id - 执行 Agent ID
 * @property {string | null} team_id - 归属团队 ID
 * @property {string} depends_on - JSON 数组字符串
 * @property {string | null} content - 执行结果
 * @property {number} priority - 任务优先级（越大越先执行）
 * @property {number | null} timeout - 超时时间（毫秒）
 * @property {number} retry_limit - 最大重试次数
 * @property {number} retry_count - 已重试次数
 * @property {string} created_at - ISO 时间字符串
 * @property {string} updated_at - ISO 时间字符串
 */
export interface TaskRow {
    id: string;
    board_id: string;
    title: string;
    description: string;
    status: string;
    assignee_id: string | null;
    team_id: string | null;
    depends_on: string;
    content: string | null;
    priority: number;
    timeout: number | null;
    retry_limit: number;
    retry_count: number;
    created_at: string;
    updated_at: string;
}

/**
 * @interface MemoryRow
 * @description SQLite memories 表行结构
 * @property {string} id - 主键
 * @property {string} scope - 作用域
 * @property {string} owner_id - 所属对象 ID
 * @property {string} key - 记忆键
 * @property {string} value - 记忆值
 * @property {string} tags - JSON 数组字符串
 * @property {string} created_at - ISO 时间字符串
 * @property {string} updated_at - ISO 时间字符串
 */
export interface MemoryRow {
    id: string;
    scope: string;
    owner_id: string;
    key: string;
    value: string;
    tags: string;
    created_at: string;
    updated_at: string;
}

/**
 * @interface MessageRow
 * @description SQLite messages 表行结构
 * @property {string} id - 主键
 * @property {string} agent_id - 所属 Agent ID
 * @property {string | null} task_id - 关联任务 ID
 * @property {string} role - 消息角色
 * @property {string} content - 消息内容
 * @property {string | null} tool_call_id - 工具调用 ID
 * @property {string | null} msg_name - 发送方名称
 * @property {string} created_at - ISO 时间字符串
 */
export interface MessageRow {
    id: string;
    agent_id: string;
    task_id: string | null;
    role: string;
    content: string;
    tool_call_id: string | null;
    msg_name: string | null;
    created_at: string;
}

/**
 * @interface ToolBundleRow
 * @description SQLite tool_bundles 表行结构
 * @property {string} id - 主键
 * @property {string} bundle_name - 工具包名称（唯一）
 * @property {string} tools_json - 工具定义 JSON 数组（序列化存储）
 * @property {string} created_at - ISO 时间字符串
 * @property {string} updated_at - ISO 时间字符串
 */
export interface ToolBundleRow {
    id: string;
    bundle_name: string;
    tools_json: string;
    created_at: string;
    updated_at: string;
}

/**
 * @interface SkillBundleRow
 * @description SQLite skill_bundles 表行结构
 * @property {string} id - 主键
 * @property {string} bundle_name - 技能包名称（唯一）
 * @property {string} skills_json - 技能定义 JSON 数组（序列化存储）
 * @property {string} created_at - ISO 时间字符串
 * @property {string} updated_at - ISO 时间字符串
 */
export interface SkillBundleRow {
    id: string;
    bundle_name: string;
    skills_json: string;
    created_at: string;
    updated_at: string;
}
