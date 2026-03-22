# XOBERON Server 架构设计文档

> 作者: X
> 版本: v1.2.0
> 最后更新: 2026-03-01

---

## 一、项目概览

XOBERON Server 是 XOBERON 个人博客平台的后端服务，提供 RESTful API 供前端 React 应用消费。

### 1.1 技术栈

| 组件 | 选型 | 版本 | 说明 |
| --- | --- | --- | --- |
| 语言 | Go | 1.25 | |
| HTTP 框架 | Gin | v1.12 | 高性能 HTTP 框架 |
| 数据库 | PostgreSQL | 16 | 主存储 |
| 向量扩展 | pgvector | latest | 文章 Embedding 语义检索 |
| SQL 工具 | sqlx | latest | 轻量 SQL 映射，手写原生 SQL |
| 数据库驱动 | pgx/v5 | latest | 纯 Go 的 PG 驱动 |
| 数据库迁移 | golang-migrate | latest | 版本化 SQL 迁移 |
| 缓存 | Redis | 7 | 缓存 + 限流 + Token 黑名单 |
| Redis 客户端 | go-redis/v9 | latest | |
| 认证 | JWT | v5 | Bearer Token |
| 密码哈希 | bcrypt | - | golang.org/x/crypto |
| 配置管理 | Viper | latest | .env + 环境变量 |
| 日志 | Zap | latest | 结构化日志 |
| UUID | UUID v7 (idgen) | latest | 时间有序主键，索引友好 |
| 监控 | Prometheus | latest | 内部端口 9091 暴露 /metrics |
| 内容审核 | DFA + 智谱 AI GLM-4.7-Flash | - | 双层审核（关键词 + AI 语义） |
| 推荐系统 | 规则评分 + 智谱 AI Embedding-3 | - | 多信号融合推荐 |
| 布隆过滤器 | bloom | latest | Slug 快速去重判定 |

### 1.2 架构风格

- **Clean Architecture**（整洁架构）—— 依赖方向永远朝内
- **轻量级 CQRS** —— 读写逻辑分离（Command / Query），共享同一数据库
- **充血模型** —— 实体封装业务规则，非贫血数据袋

---

## 二、分层架构

```
┌─────────────────────────────────────────────────────┐
│                   Adapter 层 (HTTP)                  │  ← 知道 Gin、HTTP、DTO
│  Handler → 解析请求 → 调 UseCase → 序列化响应         │
├─────────────────────────────────────────────────────┤
│                   UseCase 层                         │  ← 只依赖 Domain 接口
│  Command / Query Handler → 编排业务流程               │
├─────────────────────────────────────────────────────┤
│                   Domain 层（核心）                    │  ← 纯业务，零外部依赖
│  Entity + Value Object + Repository 接口 + 错误体系   │
│  + Domain Service 接口（审核、推荐）                   │
├─────────────────────────────────────────────────────┤
│               Infrastructure 层                      │  ← 实现 Domain 的接口
│  PostgreSQL Repo / Redis Cache / JWT / Config        │
│  + 内容审核 / 推荐系统 / 降级实现                      │
└─────────────────────────────────────────────────────┘
```

### 2.1 依赖规则

- **Domain 层**不依赖任何外部包（除 `uuid`）
- **UseCase 层**只依赖 Domain 层的接口
- **Adapter 层**依赖 UseCase 层
- **Infrastructure 层**实现 Domain 层定义的接口

**禁止方向：** Adapter → Domain（跳过 UseCase），Domain → Infrastructure

### 2.2 各层职责

| 层 | 目录 | 职责 | 禁止事项 |
| --- | --- | --- | --- |
| **Domain** | `internal/domain/` | 实体、值对象、仓储接口、领域服务接口、业务错误 | 不引入 HTTP/DB/缓存相关包 |
| **UseCase** | `internal/usecase/` | 编排业务流程、事务控制 | 不碰 `gin.Context`，不写 SQL |
| **Adapter** | `internal/adapter/` | HTTP Handler、Middleware、DTO | 不写业务逻辑，不碰数据库 |
| **Infra** | `internal/infra/` | 数据库实现、缓存、JWT、审核、推荐、配置 | 不判断业务规则 |
| **Pkg** | `pkg/` | 跨层公共工具（日志、分页、ID 生成、布隆过滤、HTML 清理） | 不依赖 internal 包 |

---

## 三、目录结构

```
server/
├── cmd/
│   └── api/
│       └── main.go                    # 启动入口，依赖组装
│
├── internal/
│   ├── domain/                        # 核心业务层
│   │   ├── entity/                    # 实体（User, Post, Essay, Comment, Contact）
│   │   ├── valueobject/               # 值对象（Email, Password, Slug, Role）
│   │   ├── repository/                # 仓储接口定义（非实现）
│   │   ├── service/                   # 领域服务接口（ContentModerator, Recommender）
│   │   ├── event/                     # 领域事件定义
│   │   └── errs/                      # 业务错误体系
│   │
│   ├── usecase/                       # 应用层
│   │   ├── command/                   # 写操作（注册、登录、创建文章、审核...）
│   │   └── query/                     # 读操作（文章列表、详情、推荐...）
│   │
│   ├── adapter/                       # 适配器层
│   │   └── http/
│   │       ├── handler/               # HTTP 处理器（Auth, Post, Essay, Comment, User, Contact, Recommendation）
│   │       ├── middleware/            # 中间件（Auth, CORS, Recover, Logger, RateLimit, BodyLimit, SecureHeaders, Metrics, RequestID）
│   │       ├── dto/                   # 请求/响应数据结构
│   │       ├── router.go             # 路由注册
│   │       └── server.go             # HTTP Server + 优雅关停
│   │
│   └── infra/                         # 基础设施层
│       ├── config/                    # 配置加载
│       ├── auth/                      # JWT 签发/验证 + Token 黑名单 + 登录限流
│       ├── persistence/
│       │   ├── postgres/              # PG 仓储实现 + 数据行模型 + 映射
│       │   ├── redis/                 # Redis 缓存 + 限流器 + Token 黑名单
│       │   └── noop/                  # 降级实现（无 Redis 时：空缓存/内存限流/内存黑名单）
│       ├── moderation/                # 内容审核
│       │   ├── keyword_filter.go      #   Layer 1: DFA 关键词过滤（Aho-Corasick）
│       │   ├── keyword_dict.go        #   敏感词词库
│       │   ├── zhipu_moderator.go     #   Layer 2: 智谱 AI GLM-4.7-Flash
│       │   ├── composite_moderator.go #   组合策略 + 自动降级
│       │   └── noop_moderator.go      #   空实现（开发环境）
│       └── recommendation/            # 推荐系统
│           ├── score_recommender.go   #   规则评分（热度+时间+标签）
│           ├── zhipu_recommender.go   #   智谱 AI Embedding 语义推荐
│           ├── zhipu_embedding.go     #   Embedding API 调用 + 向量存储
│           ├── noop_embedding.go      #   空 Embedding 实现
│           └── composite.go           #   策略选择 + 降级
│
├── pkg/                               # 公共包
│   ├── logger/                        # 结构化日志
│   ├── pagination/                    # 分页工具
│   ├── idgen/                         # UUID v7 生成器
│   ├── bloom/                         # 布隆过滤器（Slug 去重）
│   └── sanitize/                      # HTML 内容清理
│
├── migrations/                        # 数据库迁移 SQL（6 个）
├── docs/                              # 项目文档
│
├── go.mod / go.sum
├── Makefile
├── Dockerfile
├── .env.example
└── .gitignore
```

---

## 四、核心设计模式

### 4.1 Entity（充血模型）

实体字段全部私有，通过构造函数强制业务校验：

```go
// 创建 → 走 NewXxx()，强制校验
post, err := entity.NewPost(authorID, title, content, category, tags)

// 从数据库加载 → 走 ReconstructXxx()，跳过校验
post := entity.ReconstructPost(id, authorID, title, ...)

// 业务操作通过方法
err := post.Edit(editorID, editorRole, newTitle, newContent, ...)
```

**设计原则：**
- 不可能构造出不合法的实体（构造函数校验）
- 业务规则在实体方法内，不散落在 Service/Handler
- Getters 只暴露需要的字段

### 4.2 Value Object（值对象）

自带校验、不可变、相等性由值决定：

- `Email` —— 格式校验，统一小写
- `Password` —— 最少8位，内部永远存 bcrypt hash
- `Slug` —— 从标题自动生成 URL 友好短标识
- `Role` —— 枚举（user / admin）

### 4.3 Repository Pattern

Domain 层定义接口，Infrastructure 层实现：

```go
// domain/repository/post_repository.go（接口）
type PostRepository interface {
    Save(ctx context.Context, post *entity.Post) error
    FindBySlug(ctx context.Context, slug string) (*entity.Post, error)
    // ...
}

// infra/persistence/postgres/post_repo.go（实现）
type postRepo struct { db *sqlx.DB }
func NewPostRepo(db *sqlx.DB) repository.PostRepository { return &postRepo{db: db} }
```

好处：换数据库只需重新实现接口，UseCase/Domain 一行不改。

### 4.4 CQRS（Command / Query 分离）

| 类型 | 目录 | 特点 |
| --- | --- | --- |
| Command | `usecase/command/` | 有副作用（创建、修改、删除） |
| Query | `usecase/query/` | 无副作用（只读），可走缓存 |

逻辑上分离，共享同一个数据库，不引入事件溯源的复杂度。

### 4.5 错误体系

统一的 `AppError`，从 Domain 层贯穿到 Handler 层：

| 错误码 | HTTP 状态码 | 场景 |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | 参数校验失败 |
| `UNAUTHORIZED` | 401 | 未登录 / token 过期 |
| `FORBIDDEN` | 403 | 无权操作 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 唯一约束冲突 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

Handler 层统一将 `AppError` 映射为 HTTP 状态码 + JSON 错误响应。

---

## 五、认证方案

### 5.1 JWT Bearer Token

- 签发：登录成功后返回 `access_token`
- 传输：前端通过 `Authorization: Bearer <token>` 请求头携带
- 校验：`auth` 中间件拦截需要登录的接口，解析 token 并注入用户信息到 Context
- 过期：Access Token 24h，Refresh Token 7d
- 登出：token 加入 Redis 黑名单（无 Redis 时内存黑名单降级）

### 5.2 前端约定

前端 `api.ts` 已约定：
- Token 存 `localStorage`，key 为 `xoberon-token`
- 收到 401 自动清除 token 并触发 `auth:unauthorized` 事件
- 请求头格式：`Authorization: Bearer ${token}`

---

## 六、缓存策略

| 缓存 Key 模式 | 用途 | TTL |
| --- | --- | --- |
| `post:list:{key}` | 文章列表 | 5 分钟 |
| `post:detail:{slug}` | 文章详情 | 10 分钟 |
| `ratelimit:{ip}` | 接口限流 | 滑动窗口 |
| `token:blacklist:{jti}` | 登出 Token 黑名单 | Token 剩余过期时间 |

**缓存失效策略：** 文章创建/编辑/删除时，主动清除相关缓存 key。

**降级策略：** Redis 不可用时自动切换到 noop 实现（无缓存直查 DB、内存限流、内存 Token 黑名单）。

---

## 七、内容审核

双层审核架构：

```
用户发帖/评论 → Layer 1: DFA 关键词过滤（<1ms）
                  ├─ 命中 → 直接拒绝
                  └─ 未命中 → Layer 2: 智谱 AI GLM-4.7-Flash（~300ms）
                                ├─ 不合规 → 拒绝
                                └─ 通过 → 正常发布
```

**降级链：** 智谱 AI → DFA 关键词词库（不依赖任何本地模型）。

详见 [ROADMAP.md](ROADMAP.md) 第三章。

---

## 八、推荐系统

```
推荐请求 → CompositeRecommender 策略选择
             ├─ 登录 + 智谱 AI 可用 → ZhipuRecommender（Embedding 语义 + 多信号融合）
             └─ 匿名 / AI 不可用 → ScoreRecommender（热度 + 时间 + 标签）
```

**降级链：** 智谱 AI Embedding → 规则评分算法（不依赖任何本地模型）。

详见 [ROADMAP.md](ROADMAP.md) 第四章。

---

## 九、未来扩展

| 组件 | 用途 | 触发时机 | 状态 |
| --- | --- | --- | --- |
| 人工审核队列 | AI 拿不准的内容推送管理员审核 | Sprint 3 | 🔲 待实施 |
| Admin 强制删除文章/评论 | 管理员删除不当内容 | 与审核队列一起 | 🔲 待实施 |
| Kafka | 异步事件处理 | 点赞/浏览统计/通知 | 规划中 |
| Elasticsearch | 全文搜索 | 文章搜索优化 | 规划中 |
| MinIO | 对象存储 | 图片上传（头像/文章配图） | 规划中 |

领域事件接口 (`event.Publisher`) 已预留，当前使用 `NoopPublisher` 空实现。

---

## 十、部署方案

### 开发环境

```bash
docker compose up -d postgres redis   # 起基础设施
cd server && go run cmd/api/main.go   # 后端直接跑
cd web && pnpm dev                    # 前端直接跑
```

### 生产环境

```bash
docker compose --profile prod up -d --build   # 全容器化部署
```

详见根目录 `docker-compose.yml`。
