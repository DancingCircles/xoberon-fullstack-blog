# XOBERON Server 数据库设计文档

> 作者: X
> 版本: v1.2.0
> 最后更新: 2026-03-01
> 数据库: PostgreSQL 16 + pgvector

---

## 一、概览

| 表名 | 用途 | 核心关系 |
| --- | --- | --- |
| `users` | 用户账号 | 一对多 → posts, essays, comments |
| `posts` | 博客文章 | 多对一 → users，一对多 → comments |
| `essays` | 随笔/短文 | 多对一 → users |
| `comments` | 文章评论 | 多对一 → posts, users |
| `contacts` | 联系表单消息 | 独立表 |
| `post_likes` | 文章点赞记录 | 多对多关联（users ↔ posts） |
| `essay_likes` | 随笔点赞记录 | 多对多关联（users ↔ essays） |
| `user_post_views` | 用户阅读记录 | 多对多关联（users ↔ posts） |
| `post_embeddings` | 文章语义向量 | 一对一 → posts（pgvector） |

### ER 关系图

```
┌──────────┐       ┌──────────┐       ┌───────────┐
│  users   │──1:N──│  posts   │──1:N──│ comments  │
│          │       │          │       └───────────┘
│          │──1:N──│  essays  │
└──┬───┬───┘       └──┬───┬───┘
   │   │              │   │
   │   │ ┌────────────┘   │
   │   │ │                │
   │   │ │  ┌─────────────────────┐
   │   └─┼──│  post_likes         │ (users ↔ posts)
   │     │  └─────────────────────┘
   │     │  ┌─────────────────────┐
   │     └──│  user_post_views    │ (users ↔ posts)
   │        └─────────────────────┘
   │        ┌─────────────────────┐
   └────────│  essay_likes        │ (users ↔ essays)
            └─────────────────────┘

┌──────────────────┐       ┌──────────────────┐
│  contacts        │       │  post_embeddings │
│ (独立表，无外键)  │       │ (1:1 → posts)    │
└──────────────────┘       │ pgvector(1024)   │
                           └──────────────────┘
```

---

## 二、表结构详情

### 2.1 users — 用户表

```sql
CREATE TABLE users (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    handle      VARCHAR(60)  NOT NULL UNIQUE,
    avatar      TEXT         DEFAULT '',
    bio         TEXT         DEFAULT '',
    role        VARCHAR(20)  DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | UUID | PK, 自动生成 | 用户唯一标识（UUID v7） |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 登录用户名 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 邮箱（统一小写） |
| password | VARCHAR(255) | NOT NULL | bcrypt hash（cost=12） |
| name | VARCHAR(100) | NOT NULL | 显示名称 |
| handle | VARCHAR(60) | UNIQUE, NOT NULL | @handle 格式 |
| avatar | TEXT | DEFAULT '' | 头像 URL |
| bio | TEXT | DEFAULT '' | 个人简介 |
| role | VARCHAR(20) | CHECK 约束 | 角色：`user` / `admin` |
| created_at | TIMESTAMPTZ | NOT NULL | 创建时间 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新时间（触发器自动维护） |

**索引：** username, email, handle 均有唯一索引（UNIQUE 约束自动创建）。

---

### 2.2 posts — 博客文章表

```sql
CREATE TABLE posts (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    slug              VARCHAR(255) NOT NULL UNIQUE,
    excerpt           TEXT         DEFAULT '',
    content           TEXT         NOT NULL,
    category          VARCHAR(50)  NOT NULL CHECK (category IN ('Design', 'Tech', 'Culture')),
    tags              TEXT[]       DEFAULT '{}',
    like_count        INTEGER      DEFAULT 0 CHECK (like_count >= 0),
    read_time_minutes INTEGER      DEFAULT 1 CHECK (read_time_minutes >= 1),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | UUID | PK | 文章唯一标识（UUID v7） |
| author_id | UUID | FK → users, CASCADE | 作者 |
| title | VARCHAR(255) | NOT NULL | 标题（应用层限制 30 字符） |
| slug | VARCHAR(255) | UNIQUE, NOT NULL | URL 友好标识 |
| excerpt | TEXT | | 摘要（自动从 content 截取） |
| content | TEXT | NOT NULL | Markdown 原文（应用层限制 2000 字） |
| category | VARCHAR(50) | CHECK 约束 | 分类枚举 |
| tags | TEXT[] | DEFAULT '{}' | PG 原生数组（应用层限制 3 个，每个 30 字符） |
| like_count | INTEGER | >= 0 | 缓存的点赞数 |
| read_time_minutes | INTEGER | >= 1 | 预估阅读时间（分钟） |
| created_at | TIMESTAMPTZ | | 创建时间 |
| updated_at | TIMESTAMPTZ | | 更新时间（触发器自动维护） |

**索引：**

```sql
CREATE INDEX idx_posts_author    ON posts(author_id);
CREATE INDEX idx_posts_category  ON posts(category);
CREATE INDEX idx_posts_created   ON posts(created_at DESC);
CREATE INDEX idx_posts_slug      ON posts(slug);  -- UNIQUE 自动创建
CREATE INDEX idx_posts_tags      ON posts USING GIN(tags);  -- 标签查询加速
```

**设计说明：**
- `content` 使用 TEXT 类型，不限长度，存储 Markdown 原文
- `tags` 使用 PG 原生 TEXT[] 数组，避免建关联表；配合 GIN 索引加速 `@>` 查询
- `like_count` 是冗余字段（反范式），避免每次查列表都 COUNT(post_likes)
- `read_time_minutes` 在创建/编辑时由后端计算

---

### 2.3 essays — 随笔表

```sql
CREATE TABLE essays (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    excerpt     TEXT         DEFAULT '',
    content     TEXT         NOT NULL,
    like_count  INTEGER      DEFAULT 0 CHECK (like_count >= 0),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | UUID | PK | 随笔唯一标识（UUID v7） |
| author_id | UUID | FK → users, CASCADE | 作者 |
| title | VARCHAR(255) | NOT NULL | 标题（应用层限制 20 字符） |
| excerpt | TEXT | | 摘要（应用层限制 30 字符，为空自动截取） |
| content | TEXT | NOT NULL | 正文（应用层限制 500 字） |
| like_count | INTEGER | >= 0 | 缓存的点赞数 |
| created_at | TIMESTAMPTZ | | 创建时间 |
| updated_at | TIMESTAMPTZ | | 更新时间（触发器自动维护） |

**索引：**

```sql
CREATE INDEX idx_essays_author  ON essays(author_id);
CREATE INDEX idx_essays_created ON essays(created_at DESC);
```

---

### 2.4 comments — 评论表

```sql
CREATE TABLE comments (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID         NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | UUID | PK | 评论唯一标识（UUID v7） |
| post_id | UUID | FK → posts, CASCADE | 所属文章（文章删除时评论级联删除） |
| author_id | UUID | FK → users, CASCADE | 评论者 |
| content | TEXT | NOT NULL | 评论内容 |
| created_at | TIMESTAMPTZ | | 创建时间 |

**索引：**

```sql
CREATE INDEX idx_comments_post ON comments(post_id);
```

**设计说明：**
- 评论独立建表，不嵌在 posts 的 JSON 字段里
- `ON DELETE CASCADE`：删文章自动删评论，删用户自动删其评论
- 暂不支持嵌套评论（回复），后续可加 `parent_id` 字段扩展

---

### 2.5 contacts — 联系消息表

```sql
CREATE TABLE contacts (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    message     TEXT         NOT NULL,
    is_read     BOOLEAN      DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | UUID | PK | 消息唯一标识（UUID v7） |
| name | VARCHAR(100) | NOT NULL | 发送者姓名 |
| email | VARCHAR(255) | NOT NULL | 发送者邮箱 |
| message | TEXT | NOT NULL | 消息内容 |
| is_read | BOOLEAN | DEFAULT FALSE | 管理员是否已读 |
| created_at | TIMESTAMPTZ | | 提交时间 |

**设计说明：**
- 不关联 users 表（允许未注册用户提交）
- `is_read` 供管理后台使用

---

### 2.6 post_likes — 文章点赞表

```sql
CREATE TABLE post_likes (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);
```

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| user_id | UUID | PK (组合), FK → users | 点赞用户 |
| post_id | UUID | PK (组合), FK → posts | 被点赞文章 |
| created_at | TIMESTAMPTZ | | 点赞时间 |

**索引：**

```sql
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
```

---

### 2.7 essay_likes — 随笔点赞表

```sql
CREATE TABLE essay_likes (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    essay_id   UUID        NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, essay_id)
);
```

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| user_id | UUID | PK (组合), FK → users | 点赞用户 |
| essay_id | UUID | PK (组合), FK → essays | 被点赞随笔 |
| created_at | TIMESTAMPTZ | | 点赞时间 |

**索引：**

```sql
CREATE INDEX idx_essay_likes_essay ON essay_likes(essay_id);
```

**设计说明（2.6 + 2.7）：**
- 原始设计为多态 `likes` 单表（`target_type` 区分 post/essay），迁移 000002 将其拆分为两张独立表
- 拆分后每张表都有外键约束保证引用完整性
- 复合主键 `(user_id, post_id/essay_id)` 天然防止重复点赞

---

### 2.8 user_post_views — 用户阅读记录表

```sql
CREATE TABLE user_post_views (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);
```

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| user_id | UUID | PK (组合), FK → users | 阅读用户 |
| post_id | UUID | PK (组合), FK → posts | 阅读的文章 |
| viewed_at | TIMESTAMPTZ | | 阅读时间 |

**索引：**

```sql
CREATE INDEX idx_user_post_views_user ON user_post_views(user_id);
```

**设计说明：**
- 用于推荐系统的行为数据采集
- 同一用户对同一文章仅记录一次（UPSERT 语义，更新 `viewed_at`）
- 推荐算法通过用户最近阅读记录计算兴趣向量

---

### 2.9 post_embeddings — 文章语义向量表

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE post_embeddings (
    post_id    UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    embedding  vector(1024),
    model      VARCHAR(50) NOT NULL DEFAULT 'embedding-3',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| post_id | UUID | PK, FK → posts | 文章 ID（一对一） |
| embedding | vector(1024) | | 智谱 AI embedding-3 模型生成的语义向量 |
| model | VARCHAR(50) | NOT NULL | 生成向量的模型名称 |
| created_at | TIMESTAMPTZ | | 首次生成时间 |
| updated_at | TIMESTAMPTZ | | 最近更新时间 |

**索引：**

```sql
CREATE INDEX idx_post_embeddings_ivfflat
    ON post_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

**设计说明：**
- 依赖 PostgreSQL `pgvector` 扩展
- 使用 IVFFlat 近似最近邻索引，适合万级数据量
- 文章创建/更新时异步生成 Embedding，不阻塞主请求
- 推荐系统通过余弦相似度查询语义相似文章

---

## 三、自动触发器

### 3.1 updated_at 自动更新

为 `users`、`posts`、`essays` 三张表创建了 `BEFORE UPDATE` 触发器，自动将 `updated_at` 设为当前时间：

```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_posts
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_essays
    BEFORE UPDATE ON essays
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

---

## 四、迁移管理

使用 `golang-migrate` 管理数据库版本：

```bash
# 执行迁移
migrate -path migrations -database "postgres://user:pass@localhost:5432/xoberon?sslmode=disable" up

# 回滚最近一次迁移
migrate -path migrations -database "..." down 1

# 创建新迁移文件
migrate create -ext sql -dir migrations -seq add_xxx_table
```

迁移文件命名规则：`{序号}_{描述}.up.sql` / `{序号}_{描述}.down.sql`

### 迁移历史

| 序号 | 文件名 | 说明 |
| --- | --- | --- |
| 000001 | `init_schema` | 初始 schema：users, posts, essays, comments, contacts, likes |
| 000002 | `split_likes_table` | 拆分多态 likes → post_likes + essay_likes |
| 000003 | `add_tags_gin_index` | posts.tags GIN 索引 |
| 000004 | `add_updated_at_trigger` | updated_at 自动更新触发器 |
| 000005 | `add_user_post_views` | 用户阅读记录表（推荐系统） |
| 000006 | `add_post_embeddings` | 文章语义向量表（pgvector） |

---

## 五、性能考量

### 5.1 反范式设计

`posts.like_count` 和 `essays.like_count` 是冗余字段：
- 查列表时直接读，不需要 `JOIN post_likes GROUP BY`
- 点赞/取消点赞时通过 `UPDATE SET like_count = like_count ± 1` 同步更新
- 如果出现不一致，可通过定时任务校正：`UPDATE posts SET like_count = (SELECT COUNT(*) FROM post_likes WHERE ...)`

### 5.2 索引策略

- 所有外键都建了索引（PG 不会自动为外键建索引）
- `created_at DESC` 索引用于分页查询
- `category` 索引用于分类筛选
- `tags` GIN 索引用于标签包含查询
- `post_embeddings` IVFFlat 索引用于向量相似度检索

### 5.3 后续优化方向

- 文章全文搜索：`ALTER TABLE posts ADD COLUMN search_vector TSVECTOR` + GIN 索引
- 热点缓存：文章列表/详情走 Redis，减少 DB 查询（已实现）
- 连接池：`DB_MAX_OPEN_CONNS=25, DB_MAX_IDLE_CONNS=10`
- pgvector 数据量超过 10 万时考虑调整 IVFFlat `lists` 参数或换用 HNSW 索引
