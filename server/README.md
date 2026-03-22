# XOBERON Server

> XOBERON 个人博客平台后端服务
>
> **公开说明**: 当前目录提供可自建部署的后端实现示例，不包含任何私有环境密钥。
> **前端目录**: [`../web`](../web)
> **作者**: X

## 技术栈

| 组件      | 选型                          |
| --------- | ----------------------------- |
| 语言      | Go 1.25                       |
| HTTP 框架 | Gin 1.12                      |
| 数据库    | PostgreSQL 16 + pgvector      |
| SQL       | sqlx + pgx（手写原生 SQL）    |
| 缓存      | Redis 7                       |
| 认证      | JWT (Bearer Token) + 黑名单   |
| 内容审核  | DFA 关键词过滤 + 通义千问语义审核 |
| 推荐系统  | HackerNews 热度 + 标签偏好 + 浏览去重 |
| 配置      | Viper                         |
| 日志      | Zap（结构化日志）             |
| 监控      | Prometheus                    |
| 容器化    | Docker 多阶段构建             |

## 架构概览

项目采用 **Clean Architecture + CQRS** 分层设计：

```
Domain（实体/值对象/仓储接口）
  ↑
UseCase（Command / Query，业务编排）
  ↑
Adapter（HTTP Handler / Middleware / DTO）
  ↑
Infrastructure（PostgreSQL / Redis / JWT / 审核 / 推荐）
```

核心特性：

- **Redis 降级**：Redis 不可用时自动降级到本地内存实现（缓存/限流/黑名单），服务不中断
- **双重审核**：同步 DFA 关键词过滤（<1ms）+ 异步通义千问 AI 语义巡查
- **优雅关停**：SIGTERM 后协调关闭 HTTP 服务、AI 巡查 Worker、Metrics 服务和本地降级组件
- **安全加固**：9 层中间件（Recover → RequestID → Metrics → Logger → CORS → SecureHeaders → BodyLimit → Auth → RateLimit）

## 快速开始

### 1. 环境准备

- Go 1.25+
- Docker & Docker Compose
- [golang-migrate](https://github.com/golang-migrate/migrate) CLI（可选，也可手动执行 SQL）

### 2. 启动基础设施（Docker）

项目依赖 PostgreSQL 16（pgvector）+ Redis 7，全部通过 Docker 容器运行，**无需本地安装**。

```bash
docker compose up -d postgres redis
```

这会启动两个容器：

| 容器名 | 镜像 | 端口 | 说明 |
|---|---|---|---|
| `xoberon-pg` | `pgvector/pgvector:pg16` | `5432` | PostgreSQL + pgvector 向量扩展 |
| `xoberon-redis` | `redis:7-alpine` | `6379` | Redis 缓存 + 限流 + Token 黑名单 |

验证容器状态：

```bash
docker ps
# 两个容器应该都是 Up ... (healthy)
```

**数据库连接参数：**

| 参数 | 值 |
|---|---|
| 主机 | `localhost` |
| 端口 | `5432` |
| 用户名 | `postgres` |
| 密码 | 见 `.env` |
| 数据库 | `xoberon` |
| SSL | 关闭 |

### 3. 配置环境变量

```bash
cd server
cp .env.example .env
# 编辑 .env 修改 JWT_SECRET 和数据库密码（需与 docker-compose.yml 一致）
```

关键配置项：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SERVER_PORT` | HTTP 端口 | `8080` |
| `JWT_SECRET` | JWT 签名密钥（≥32 字符） | 必须修改 |
| `DB_PASSWORD` | PostgreSQL 密码 | 必须修改 |
| `MODERATION_ENABLED` | 是否启用 DFA 关键词过滤 | `true` |
| `MODERATION_WORKER_ENABLED` | 是否启用 AI 异步巡查 | `true` |
| `QWEN_API_KEY` | 通义千问 API Key（巡查用） | 空则跳过 |

完整配置参考 [.env.example](.env.example)。

### 4. 数据库迁移

如果已安装 `golang-migrate` CLI：

```bash
make migrate-up
```

如果未安装，可以手动按顺序执行所有 13 个迁移文件：

```bash
# 按顺序执行所有 up 迁移
for i in $(seq -w 1 13); do
  docker exec -i xoberon-pg psql -U postgres -d xoberon < migrations/0000${i}_*.up.sql
done
```

或逐个执行：

```bash
docker exec -i xoberon-pg psql -U postgres -d xoberon < migrations/000001_init_schema.up.sql
docker exec -i xoberon-pg psql -U postgres -d xoberon < migrations/000002_split_likes_table.up.sql
# ... 依此类推到 000013
```

### 5. 创建 Owner 账户

首次部署后，需要手动将一个已注册用户提升为 owner（最高权限）：

```bash
# 先通过 API 或前端注册一个账户，然后执行：
docker exec xoberon-pg psql -U postgres -d xoberon \
  -c "UPDATE users SET role = 'owner' WHERE handle = '@你的用户名' RETURNING name, handle, role;"
```

### 6. 启动服务

```bash
make run
# 或直接
go run cmd/api/main.go
# 服务启动在 http://localhost:8080
```

开发模式（热重载）：

```bash
make dev  # 需要安装 Air
```

### 7. 验证

```bash
curl http://localhost:8080/api/health
# 应返回: {"status":"ok"}
```

## 常用命令

```bash
make run              # 启动开发服务器
make dev              # Air 热重载开发
make build            # 编译二进制到 ./bin/
make test             # 运行测试（-race 检测竞态）
make lint             # golangci-lint 代码检查
make tidy             # 整理依赖
make migrate-up       # 执行数据库迁移
make migrate-down     # 回滚最近一次迁移
make migrate-create   # 创建新迁移文件
make docker-up        # 启动 PG + Redis
make docker-down      # 停止容器
make docker-all       # 全容器化部署
```

## 项目结构

```
server/
├── cmd/api/                # 启动入口（依赖组装 + 优雅关停）
├── internal/
│   ├── domain/             # 核心业务层
│   │   ├── entity/         #   实体（Post/User/Essay/Comment/Contact）
│   │   ├── valueobject/    #   值对象（Email/Password/Slug/Role）
│   │   ├── errs/           #   领域错误体系（AppError）
│   │   ├── repository/     #   仓储接口 + 缓存接口
│   │   └── service/        #   领域服务接口（ContentModerator/Recommender）
│   ├── usecase/            # 应用层
│   │   ├── command/        #   写操作（16 个 Handler）
│   │   └── query/          #   读操作（11 个 Handler + Cache DTO）
│   ├── adapter/http/       # HTTP 适配器
│   │   ├── handler/        #   路由处理器（10 个 Handler）
│   │   ├── middleware/     #   中间件（9 个）
│   │   ├── dto/            #   请求/响应 DTO
│   │   ├── router.go       #   路由注册
│   │   └── server.go       #   HTTP Server + 优雅关停
│   └── infra/              # 基础设施
│       ├── auth/           #   JWT 签发/验证 + Token 黑名单 + 登录限流
│       ├── config/         #   Viper 配置加载
│       ├── moderation/     #   内容审核（DFA + 通义千问 + Worker）
│       ├── persistence/    #   数据持久化
│       │   ├── postgres/   #     PostgreSQL 仓储实现
│       │   ├── redis/      #     Redis 缓存 + 限流实现
│       │   └── noop/       #     Redis 不可用时的本地降级实现
│       └── recommendation/ #   推荐系统（HackerNews 热度算法）
├── pkg/                    # 公共工具包
│   ├── bloom/              #   布隆过滤器（slug 去重）
│   ├── idgen/              #   UUID v7 生成器
│   ├── logger/             #   Zap 日志封装
│   ├── pagination/         #   分页参数
│   └── sanitize/           #   HTML 内容清理（bluemonday）
├── migrations/             # SQL 迁移文件（13 个，含 up + down）
├── docs/                   # 项目文档
├── Dockerfile              # 多阶段构建（golang:1.25-alpine → alpine:3.20）
├── Makefile                # 开发/构建/部署命令
└── .env.example            # 环境变量模板
```

## 中间件管线

请求处理按以下顺序经过 9 层中间件：

| 顺序 | 中间件 | 作用 |
|------|--------|------|
| 1 | Recover | Panic 恢复，返回 500 不暴露堆栈 |
| 2 | RequestID | 为每个请求分配唯一 X-Request-ID |
| 3 | Metrics | Prometheus 请求计数 + 延迟直方图 |
| 4 | Logger | 结构化请求日志（zap） |
| 5 | CORS | 白名单 Origin 校验 |
| 6 | SecureHeaders | HSTS / CSP / X-Frame-Options 等安全头 |
| 7 | BodyLimit | 请求体 2MB 限制 |
| 8 | Auth / OptionalAuth | JWT Bearer Token 鉴权 + Token 黑名单 |
| 9 | RateLimit | 基于 IP 的滑动窗口限流（20 次/分） |

## 文档

- [架构设计](docs/ARCHITECTURE.md) — 分层架构、设计模式、技术决策
- [API 接口](docs/API.md) — 完整的 RESTful API 规范
- [数据库设计](docs/DATABASE.md) — 表结构、索引、ER 关系
- [测试报告](docs/TEST_REPORT.md) — 代码质量、安全性、Bug 修复记录
- [开发路线图](docs/ROADMAP.md) — 迭代计划与进度

## API 概览

所有业务接口均在 `/api/v1/` 前缀下。

### 认证

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/v1/auth/register | 注册 | 公开（限流） |
| POST | /api/v1/auth/login | 登录 | 公开（限流） |
| POST | /api/v1/auth/logout | 登出（Token 加入黑名单） | 登录 |

### 文章

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/v1/posts | 文章列表（分页/分类/搜索） | 公开 |
| GET | /api/v1/posts/:slug | 文章详情（Slug 路由） | 公开 |
| POST | /api/v1/posts | 创建文章 | 登录（限流） |
| PUT | /api/v1/posts/:id | 编辑文章 | 作者/管理员 |
| DELETE | /api/v1/posts/:id | 删除文章 | 作者/管理员 |
| POST | /api/v1/posts/:id/like | 点赞/取消点赞 | 登录 |
| GET | /api/v1/posts/:id/comments | 评论列表 | 公开 |
| POST | /api/v1/posts/:id/comments | 发表评论 | 登录（限流） |
| POST | /api/v1/posts/:id/view | 记录阅读（推荐去重） | 登录 |
| GET | /api/v1/posts/recommendations | 推荐文章 | 公开/登录 |

### 随笔

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/v1/essays | 随笔列表 | 公开 |
| GET | /api/v1/essays/:id | 随笔详情 | 公开 |
| POST | /api/v1/essays | 创建随笔 | 登录（限流） |
| PUT | /api/v1/essays/:id | 编辑随笔 | 作者/管理员 |
| DELETE | /api/v1/essays/:id | 删除随笔 | 作者/管理员 |
| POST | /api/v1/essays/:id/like | 点赞/取消点赞 | 登录 |

### 用户

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/v1/users/:handle | 用户公开资料 | 公开 |
| GET | /api/v1/users | 搜索用户 | 登录 |
| PUT | /api/v1/users/me | 修改个人资料 | 登录（限流） |
| PUT | /api/v1/users/me/password | 修改密码 | 登录（限流） |

### 联系 & 心跳

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/v1/contact | 联系表单（含蜜罐反机器人） | 公开（限流） |
| POST | /api/v1/heartbeat | 在线心跳 | 登录 |

### 管理后台

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/v1/admin/stats | 仪表盘统计 | 管理员 |
| GET | /api/v1/admin/activities | 活动日志 | 管理员 |
| GET | /api/v1/admin/contacts | 联系消息列表 | 管理员 |
| PUT | /api/v1/admin/contacts/:id/read | 标记消息已读 | 管理员 |
| GET | /api/v1/admin/users | 用户列表 | 管理员 |
| PUT | /api/v1/admin/users/:id/role | 修改用户角色 | 管理员 |
| GET | /api/v1/admin/reviews | 审核列表 | 管理员 |
| PUT | /api/v1/admin/reviews/:id/approve | 通过审核 | 管理员 |
| PUT | /api/v1/admin/reviews/:id/reject | 拒绝审核 | 管理员 |
| DELETE | /api/v1/admin/comments/:id | 删除评论 | 管理员 |
| GET | /api/v1/admin/online-count | 在线人数 | 管理员 |

### 基础设施

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/health | 健康检查（DB + Redis） | 公开 |

## 数据库迁移列表

| 序号 | 迁移名称 | 说明 |
|------|----------|------|
| 000001 | init_schema | 初始表结构（users/posts/essays/comments/contacts/likes） |
| 000002 | split_likes_table | 拆分 likes 为 post_likes + essay_likes |
| 000003 | add_tags_gin_index | 标签 GIN 索引 |
| 000004 | add_updated_at_trigger | updated_at 自动更新触发器 |
| 000005 | add_user_post_views | 用户阅读记录表 |
| 000006 | add_post_embeddings | 文章向量嵌入字段 |
| 000007 | add_reviews_and_owner_role | 审核表 + owner 角色 |
| 000008 | add_post_review_status | 文章审核状态字段 |
| 000009 | add_comment_review_status | 评论审核状态字段 |
| 000010 | add_essay_review_status | 随笔审核状态字段 |
| 000011 | add_review_tracking | 审核追踪字段 |
| 000012 | replace_confidence_with_decision | AI 置信度替换为决策字段 |
| 000013 | add_trgm_search_indexes | pg_trgm 模糊搜索索引 |

## 安全机制

| 措施 | 实现 |
|------|------|
| SQL 注入防护 | 全部参数化查询 |
| JWT 认证 | HS256 + 算法校验 + Token 黑名单（fail-closed） |
| 密码安全 | bcrypt cost=12 + 长度/复杂度校验 + 时序安全比较 |
| 暴力破解防护 | 登录失败 5 次锁定 15 分钟 |
| API 限流 | 基于 IP 的滑动窗口 20 次/分钟 |
| XSS 防护 | bluemonday HTML 清理 |
| 安全响应头 | HSTS / CSP / X-Frame-Options / X-Content-Type-Options |
| 请求体限制 | 2MB 全局限制 |
| 蜜罐反机器人 | 联系表单隐藏字段检测 |
| CORS 白名单 | 仅允许配置的 Origin |

## 部署说明

本仓库保留的是可复用的部署模板，而不是特定生产环境的真实配置。

如果你需要部署到自己的服务器，请至少替换以下内容：

- `.env` 中的数据库、Redis、JWT 和第三方服务密钥
- `nginx/nginx.conf` 中的域名与证书路径
- `.github/workflows/ci.yml` 中的部署目标与 secret 名称
- `scripts/deploy.sh` 中与你自己的服务器目录和发布方式相关的逻辑

一个通用示例：

```bash
ssh your-user@your-host
cd /srv/xoberon-server
./scripts/deploy.sh
```

## 开发者

**X**
