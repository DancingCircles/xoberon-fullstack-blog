# XOBERON Server 后续开发计划

> 作者: X
> 版本: v1.2.0
> 创建日期: 2026-03-01
> 最后更新: 2026-03-01
> 基于: ARCHITECTURE.md v1.0.0

---

## 一、文档目的

本文档是 XOBERON Server 第二阶段迭代的开发规范与技术路线图。基于第一阶段代码审计结果，聚焦四个核心方向：

1. **ID 生成策略升级** — UUID v4 → UUID v7 ✅ 已完成
2. **内容安全（敏感词过滤）** — DFA 关键词 + 智谱 AI GLM-4.7-Flash 双层审核 ✅ 已完成
3. **推荐系统** — 规则评分 + 智谱 AI Embedding 语义推荐 ✅ 已完成
4. **人工审核队列** — AI 不确定内容推送管理员审核 🔲 待实施

**LLM 技术选型决策**：内容审核与推荐系统统一使用 **智谱 AI GLM-4.7-Flash**（永久免费 API，30B MoE 架构）。

**降级策略**（无需任何本地模型）：
- 智谱 AI 可用 → AI 审核 + AI 语义推荐
- 智谱 AI 不可用 → DFA 敏感词词库 + 规则评分推荐算法

每个方向按 **MVP → 迭代** 的节奏推进，避免过度设计。

---

## 二、ID 生成策略升级 ✅ 已完成

### 2.1 现状问题

当前所有实体使用 `uuid.New()` 生成 UUID v4（完全随机），存在以下问题：

| 问题                               | 影响                |
| ---------------------------------- | ------------------- |
| 随机分布导致 B-Tree 索引页频繁分裂 | 写入性能下降 40-50% |
| 无法从 ID 推断创建时间             | 排查问题困难        |
| 无序写入产生大量随机 I/O           | 磁盘利用率低        |

**涉及实体**：User、Post、Essay、Comment、Contact、JWT JTI

### 2.2 目标方案：UUID v7（RFC 9562）

**选择理由**：

| 对比项       | UUID v4（当前） | UUID v7（目标） | 雪花算法       | ULID           |
| ------------ | --------------- | --------------- | -------------- | -------------- |
| 数据库兼容性 | ✅ UUID 类型     | ✅ UUID 类型     | ❌ 需改 BIGINT  | ❌ 需改 VARCHAR |
| 时间有序     | ❌               | ✅               | ✅              | ✅              |
| 分布式安全   | ✅               | ✅               | ⚠️ 需配置机器ID | ✅              |
| 迁移成本     | -               | ✅ 零成本        | ❌ 改 schema    | ❌ 改 schema    |
| 索引效率     | ⭐⭐              | ⭐⭐⭐⭐⭐           | ⭐⭐⭐⭐⭐          | ⭐⭐⭐⭐⭐          |

**UUID v7 结构（128 bit）**：

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
├───────────────────────────────────────────────────────────────────┤
│                      unix_ts_ms (48 bit)                         │
├───────────────────────────────────────────────────────────────────┤
│  ver(4bit=0111) │    rand_a (12 bit)                             │
├───────────────────────────────────────────────────────────────────┤
│  var(2bit=10)   │    rand_b (62 bit)                             │
├───────────────────────────────────────────────────────────────────┤
```

- 前 48 位：Unix 毫秒时间戳 → **天然有序**
- 后 80 位：随机数 → **防冲突**

### 2.3 实施方案（已完成）

#### Step 1: ID 生成器包

**文件**：`pkg/idgen/idgen.go`

```go
package idgen

import "github.com/google/uuid"

func New() uuid.UUID {
    return uuid.Must(uuid.NewV7())
}
```

#### Step 2: 替换清单（已全部替换）

| 文件                | 旧代码                | 新代码                 | 状态 |
| ------------------- | --------------------- | ---------------------- | ---- |
| `entity/user.go`    | `uuid.New()`          | `idgen.New()`          | ✅    |
| `entity/post.go`    | `uuid.New()`          | `idgen.New()`          | ✅    |
| `entity/essay.go`   | `uuid.New()`          | `idgen.New()`          | ✅    |
| `entity/comment.go` | `uuid.New()`          | `idgen.New()`          | ✅    |
| `entity/contact.go` | `uuid.New()`          | `idgen.New()`          | ✅    |
| `infra/auth/jwt.go` | `uuid.New().String()` | `idgen.New().String()` | ✅    |

### 2.4 验收标准

- [x] 所有 `uuid.New()` 替换为 `idgen.New()`
- [x] 新增 `pkg/idgen/idgen_test.go`，验证时间有序性
- [x] `go test ./...` 全部通过
- [x] 向后兼容：数据库 `UUID` 字段类型不变，v4 历史数据正常使用

---

## 三、内容安全：敏感词过滤 ✅ 已完成

### 3.1 双层审核架构

```
用户发帖/评论
     │
     ▼
┌─────────────────────┐
│ Layer 1: DFA 快速过滤 │ ← Aho-Corasick 多模式匹配（同步，<1ms）
│ 命中 → 直接拒绝       │
└────────┬────────────┘
         │ 未命中
         ▼
┌─────────────────────┐
│ Layer 2: 智谱 AI 审核 │ ← GLM-4.7-Flash（同步，~300ms）
│ 不合规 → 拒绝          │
│ 拿不准 → 送入审核队列  │ ← v1.2.0 新增
└────────┬────────────┘
         │ 通过
         ▼
     正常发布
```

**Layer 1** 负责拦截明显违规词（成本零、延迟零）。
**Layer 2** 负责理解语义、识别变体和隐喻（高准确率）。
**审核队列** 处理 AI 置信度不高的内容（见第五章）。

### 3.2 架构实现

#### 领域层接口

**文件**：`internal/domain/service/content_moderator.go`

```go
package service

import "context"

type ModerationResult struct {
    Allowed bool
    Reason  string
    Labels  []string
}

type ContentModerator interface {
    Check(ctx context.Context, text string) (*ModerationResult, error)
}
```

#### 基础设施层实现

```
internal/infra/moderation/
├── keyword_filter.go      # Layer 1: DFA 关键词过滤（Aho-Corasick 多模式匹配）
├── keyword_dict.go        # 敏感词词库（内置 + 可配置）
├── zhipu_moderator.go     # Layer 2: 智谱 AI GLM-4.7-Flash 审核
├── composite_moderator.go # 组合策略（Layer 1 + Layer 2 + 降级）
└── noop_moderator.go      # 空实现（开发环境跳过审核）
```

#### UseCase 集成点（已全部集成）

| UseCase    | 文件                                | 状态 |
| ---------- | ----------------------------------- | ---- |
| 创建文章   | `usecase/command/create_post.go`    | ✅    |
| 更新文章   | `usecase/command/update_post.go`    | ✅    |
| 创建 Essay | `usecase/command/create_essay.go`   | ✅    |
| 更新 Essay | `usecase/command/update_essay.go`   | ✅    |
| 创建评论   | `usecase/command/create_comment.go` | ✅    |

### 3.3 降级策略

```
请求智谱 AI
    │
    ├─ 成功 → 使用 AI 审核结果
    │
    ├─ 超时/网络错误 → 降级到 DFA 关键词过滤
    │
    └─ API Key 未配置 → 仅使用 DFA 关键词过滤
```

**降级链只有两级**：智谱 AI → DFA 关键词词库。不依赖任何本地模型。

### 3.4 Prompt 设计

```
你是一个内容审核助手。请判断以下用户发布的内容是否合规。

审核维度：
1. 政治敏感：涉及国家领导人、政治体制批评、分裂言论
2. 色情低俗：露骨性描写、色情暗示
3. 暴力血腥：暴力行为描写、恐怖内容
4. 广告垃圾：商业推广、引流链接、垃圾信息
5. 人身攻击：辱骂、歧视、仇恨言论

请严格按以下 JSON 格式返回（不要返回其他内容）：
{"allowed": true/false, "confidence": 0.0-1.0, "reason": "原因", "labels": ["标签"]}

用户内容：
---
{content}
---
```

> **v1.2.0 变更**：Prompt 新增 `confidence` 字段（0.0-1.0），用于判断 AI 是否"拿不准"。当 `confidence < 0.8` 且 `allowed = false` 时，内容不直接拒绝，而是送入审核队列。

### 3.5 验收标准

- [x] `ContentModerator` 接口定义在 Domain 层
- [x] DFA 关键词过滤实现（Aho-Corasick）+ 内置基础词库
- [x] 智谱 AI GLM-4.7-Flash 审核实现
- [x] `NoopModerator` 开发环境可用
- [x] `CompositeModerator` 组合策略 + 自动降级
- [x] 所有写操作 UseCase 集成审核
- [x] 环境变量文档更新（`.env.example`）
- [ ] AI 置信度判断 + 审核队列集成（见第五章）
- [ ] 审核结果审计日志（含被拒绝内容摘要、原因、标签）

---

## 四、推荐系统 ✅ 已完成

### 4.1 推荐架构

```
┌──────────────────────────────────────────────────────┐
│                    推荐请求入口                         │
│           GET /api/posts/recommendations               │
│           Authorization: Bearer <token>（可选）         │
└────────────────────────┬─────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │ CompositeRecommender    │
            │ 动态选择推荐策略         │
            └────────────┬────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
┌─────────────────────┐     ┌─────────────────────┐
│ ZhipuRecommender    │     │ ScoreRecommender    │
│ (登录 + AI 可用)     │     │ (匿名 / AI 不可用)  │
│ 语义相似度 + 多信号  │     │ 热度 + 时间 + 标签  │
└─────────────────────┘     └─────────────────────┘
```

### 4.2 Phase 1：规则评分推荐 ✅ 已完成

#### 算法公式

```
推荐分数 = W_heat × 热度分 + W_time × 时间分 + W_tag × 标签匹配分

热度分 = min(like_count × 2 + comment_count × 3, 100) / 100
时间分 = 1 / (1 + days_since_publish / 7)
标签匹配分 = |用户喜欢文章的标签 ∩ 候选文章标签| / |候选文章标签|

权重默认值：W_heat=0.4, W_time=0.3, W_tag=0.3
```

**作为永久降级方案保留**——智谱 AI 不可用时、匿名用户时，自动使用此算法。

#### 行为数据采集

```sql
CREATE TABLE user_post_views (
    user_id    UUID NOT NULL REFERENCES users(id),
    post_id    UUID NOT NULL REFERENCES posts(id),
    viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);
CREATE INDEX idx_user_post_views_user ON user_post_views(user_id);
```

### 4.3 Phase 2：智谱 AI Embedding 语义推荐 ✅ 已完成

#### 核心原理

利用智谱 AI Embedding API（`embedding-3`，1024 维向量）将文章转换为语义向量，通过余弦相似度实现"理解内容含义"的推荐。

#### 推荐算法公式（Phase 2）

```
最终推荐分 = W_semantic × 语义相似度 + W_heat × 热度分 + W_time × 时间分 + W_behavior × 行为匹配分

语义相似度 = cosine(用户兴趣向量, 候选文章向量)
用户兴趣向量 = Σ(交互权重_i × 文章向量_i) / Σ(交互权重_i)

权重默认值：W_semantic=0.5, W_heat=0.2, W_time=0.15, W_behavior=0.15
```

#### 工作流

```
文章创建/更新时（异步，不阻塞主请求）：
  1. 拼接 title + tags + content（截取前 2000 字）
  2. 调用智谱 AI /v4/embeddings 获取 1024 维向量
  3. 存入 post_embeddings 表
  4. 清除相关推荐缓存

推荐请求时：
  1. 检查 Redis 缓存
  2. 获取用户最近交互的文章 ID 列表
  3. 从 post_embeddings 加载向量
  4. 计算加权平均 → 用户兴趣向量
  5. pgvector 执行 ANN 查询，获取候选集
  6. 多信号融合评分，返回 Top N
  7. 写入 Redis 缓存

匿名用户 → ScoreRecommender（规则评分）
```

#### 数据库扩展

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE post_embeddings (
    post_id    UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    embedding  vector(1024),
    model      VARCHAR(50) NOT NULL DEFAULT 'embedding-3',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_post_embeddings_ivfflat
    ON post_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

#### 实现文件

```
internal/infra/recommendation/
├── score_recommender.go    # 规则评分（永久保留为降级方案）
├── zhipu_recommender.go    # 智谱 AI Embedding 语义推荐
├── zhipu_embedding.go      # 调用智谱 Embedding API + 存储向量
├── noop_embedding.go       # 空 Embedding 实现（无 AI 时使用）
└── composite.go            # 策略选择 + 降级
```

### 4.4 API 接口

```
GET /api/posts/recommendations?limit=5&exclude=id1,id2
Authorization: Bearer <token>  （可选）

Response:
{
  "data": [
    { "id": "...", "title": "...", "excerpt": "...", ... }
  ],
  "meta": {
    "algorithm": "zhipu_embedding" | "score_based",
    "cached": true | false
  }
}

POST /api/posts/:id/view
Authorization: Bearer <token>  （必须）
→ 记录用户阅读行为
```

### 4.5 验收标准

- [x] `Recommender` + `EmbeddingGenerator` 接口定义在 Domain 层
- [x] 规则评分推荐实现
- [x] `GET /api/posts/recommendations` 接口可用
- [x] 匿名/登录用户均可调用（策略不同）
- [x] `POST /api/posts/:id/view` 记录阅读行为
- [x] 智谱 AI Embedding API 集成
- [x] 文章创建/更新时异步生成 Embedding
- [x] pgvector 扩展 + IVFFlat 索引
- [x] 多信号融合评分算法
- [x] CompositeRecommender 策略选择 + 自动降级
- [ ] 推荐结果排除「待审核」状态的文章（依赖第五章）

---

## 五、人工审核队列 🔲 待实施

### 5.1 问题背景

AI 审核并非 100% 准确。存在以下情况：

| 场景                       | AI 行为    | 问题         |
| -------------------------- | ---------- | ------------ |
| 明确违规                   | 直接拒绝   | ✅ 正确       |
| 明确合规                   | 直接放行   | ✅ 正确       |
| **擦边 / 隐喻 / 语境模糊** | **拿不准** | ❌ 误杀或放过 |

同理，推荐系统也可能将不当内容推送给用户（尤其是被 DFA 漏过、AI 降级时）。

**解决方案**：建立人工审核队列。AI "拿不准"的内容不直接放行或拒绝，而是送入审核队列由管理员最终裁决。

### 5.2 内容状态模型

为文章/Essay/评论引入审核状态字段：

```
┌──────────┐    AI 判定合规     ┌──────────┐
│  创建中   │ ──────────────→  │  已发布   │
└──────────┘                   └──────────┘
      │                              ▲
      │ AI 拿不准                     │ 管理员通过
      │ (confidence < 0.8)           │
      ▼                              │
┌──────────────┐                     │
│  待人工审核   │ ────────────────────┘
│  (pending)   │
└──────────────┘
      │
      │ 管理员拒绝
      ▼
┌──────────┐
│  已拒绝   │
└──────────┘
```

#### 数据库变更

```sql
-- 为 posts 表添加审核状态
ALTER TABLE posts ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'published';
-- 可选值: 'published', 'pending_review', 'rejected'

ALTER TABLE posts ADD COLUMN moderation_note TEXT;
-- 审核备注（AI 的 reason + 管理员批注）

ALTER TABLE posts ADD COLUMN moderation_confidence REAL;
-- AI 审核置信度

CREATE INDEX idx_posts_moderation_status ON posts(moderation_status)
    WHERE moderation_status = 'pending_review';
-- 部分索引，只索引待审核的行

-- essays 和 comments 同理
ALTER TABLE essays ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'published';
ALTER TABLE essays ADD COLUMN moderation_note TEXT;

ALTER TABLE comments ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'published';
ALTER TABLE comments ADD COLUMN moderation_note TEXT;
```

### 5.3 审核决策逻辑

修改 `CompositeModerator` 返回更丰富的结果：

```go
type ModerationResult struct {
    Allowed    bool
    Confidence float64   // AI 置信度 0.0-1.0（DFA 命中时为 1.0）
    Reason     string
    Labels     []string
    Action     string    // "allow" | "reject" | "pending_review"
}
```

决策矩阵：

| Layer 1 (DFA) | Layer 2 (AI)  | AI Confidence | 最终决策                                   |
| ------------- | ------------- | ------------- | ------------------------------------------ |
| 命中          | —             | —             | **直接拒绝** (`reject`)                    |
| 未命中        | allowed=true  | >= 0.8        | **放行** (`allow`)                         |
| 未命中        | allowed=true  | < 0.8         | **放行** (`allow`，低置信度也认可安全判断) |
| 未命中        | allowed=false | >= 0.8        | **拒绝** (`reject`)                        |
| 未命中        | allowed=false | < 0.8         | **送审** (`pending_review`) ← 核心         |
| 未命中        | 调用失败      | —             | **放行但标记** (`allow`，记录日志)         |

> **核心规则**：只有当 AI 认为"不合规"但置信度低于阈值时，才送入审核队列。这避免了大量正常内容被送审。

### 5.4 UseCase 变更

修改所有写操作的 UseCase，根据 `ModerationResult.Action` 设置内容状态：

```go
func (h *CreatePostHandler) Handle(ctx context.Context, cmd CreatePostCmd) (*entity.Post, error) {
    result, err := h.moderator.Check(ctx, cmd.Title + " " + cmd.Content)
    if err != nil {
        return nil, fmt.Errorf("内容审核服务异常: %w", err)
    }

    switch result.Action {
    case "reject":
        return nil, errs.Validationf("内容不合规: %s", result.Reason)
    case "pending_review":
        // 创建文章但标记为待审核
        post, err := entity.NewPost(...)
        post.SetModerationStatus("pending_review", result.Reason, result.Confidence)
        // 保存，但不在公开列表中显示
        return post, nil
    default: // "allow"
        post, err := entity.NewPost(...)
        // 正常发布
        return post, nil
    }
}
```

### 5.5 推荐系统联动

待审核的内容必须排除在推荐结果之外：

```go
// ScoreRecommender 和 ZhipuRecommender 的查询条件
WHERE moderation_status = 'published'
  AND post_id NOT IN (排除列表)
```

### 5.6 管理员审核 API

```
# 获取待审核列表
GET /api/admin/reviews?page=1&size=20&type=post
Authorization: Bearer <admin_token>

Response:
{
  "data": [
    {
      "id": "...",
      "content_type": "post",
      "content_id": "...",
      "title": "...",
      "excerpt": "...",
      "ai_reason": "疑似涉及政治隐喻",
      "ai_confidence": 0.65,
      "ai_labels": ["politics"],
      "created_at": "2026-03-01T12:00:00Z",
      "author": { "id": "...", "nickname": "..." }
    }
  ],
  "total": 3
}

# 审核通过
POST /api/admin/reviews/:id/approve
Authorization: Bearer <admin_token>
Body: { "note": "管理员备注（可选）" }

# 审核拒绝
POST /api/admin/reviews/:id/reject
Authorization: Bearer <admin_token>
Body: { "reason": "拒绝原因" }
```

### 5.7 架构设计

#### 新增文件

```
internal/domain/entity/
└── review.go              # 审核记录实体（可选，或直接用 Post 状态）

internal/domain/repository/
└── review_repository.go   # 审核记录查询接口

internal/usecase/query/
└── list_pending_reviews.go # 查询待审核内容

internal/usecase/command/
├── approve_review.go       # 通过审核
└── reject_review.go        # 拒绝审核

internal/adapter/http/handler/
└── admin_handler.go        # 管理员审核 API Handler

internal/adapter/http/middleware/
└── admin_auth.go           # 管理员权限校验中间件
```

#### 路由注册

```go
// router.go
admin := r.Group("/api/admin", middleware.Auth(jwtService), middleware.AdminOnly())
{
    admin.GET("/reviews", handlers.Admin.ListPendingReviews)
    admin.POST("/reviews/:id/approve", handlers.Admin.ApproveReview)
    admin.POST("/reviews/:id/reject", handlers.Admin.RejectReview)
}
```

### 5.8 用户端体验

| 状态             | 用户看到的                     | 其他用户看到的 |
| ---------------- | ------------------------------ | -------------- |
| `published`      | 正常显示                       | 正常显示       |
| `pending_review` | "您的内容正在审核中"           | 不可见         |
| `rejected`       | "您的内容因违规被移除: {原因}" | 不可见         |

### 5.9 验收标准

- [ ] 数据库迁移：posts/essays/comments 添加 `moderation_status`、`moderation_note`、`moderation_confidence` 字段
- [ ] `ModerationResult` 扩展 `Confidence` + `Action` 字段
- [ ] 智谱 AI Prompt 新增 `confidence` 输出
- [ ] `CompositeModerator` 实现置信度决策矩阵
- [ ] 所有写操作 UseCase 根据 Action 设置状态
- [ ] 查询接口过滤 `moderation_status != 'published'` 的内容
- [ ] 推荐系统排除非 `published` 内容
- [ ] 管理员审核 API（列表/通过/拒绝）
- [ ] 管理员权限中间件
- [ ] 作者可见自己的待审核内容（显示审核中状态）

---

## 六、实施优先级与排期

### 6.1 优先级矩阵

```
           影响大
             │
     ┌───────┼───────┐
     │  P0   │  P1   │
     │UUID v7│内容审核│
     │  ✅   │  ✅    │
─────┼───────┼───────┼───── 紧急度
     │  P1   │  P2   │
     │推荐   │审核队列│
     │  ✅   │  🔲   │
     └───────┼───────┘
             │
           影响小
```

### 6.2 排期

| 阶段         | 任务                                           | 预估工期 | 状态     |
| ------------ | ---------------------------------------------- | -------- | -------- |
| **Sprint 1** | UUID v7 升级                                   | 0.5 天   | ✅ 已完成 |
| **Sprint 1** | 内容审核 — DFA 关键词过滤（Layer 1）           | 1 天     | ✅ 已完成 |
| **Sprint 1** | 推荐系统 Phase 1（规则评分 + 行为采集）        | 1.5 天   | ✅ 已完成 |
| **Sprint 2** | 内容审核 — 智谱 AI GLM-4.7-Flash（Layer 2）    | 1.5 天   | ✅ 已完成 |
| **Sprint 2** | 推荐系统 Phase 2（智谱 AI Embedding 语义推荐） | 2 天     | ✅ 已完成 |
| **Sprint 3** | 人工审核队列 — 数据库迁移 + 状态模型           | 0.5 天   | 🔲 待实施 |
| **Sprint 3** | 人工审核队列 — AI 置信度决策 + UseCase 改造    | 1 天     | 🔲 待实施 |
| **Sprint 3** | 人工审核队列 — 管理员审核 API + 权限中间件     | 1.5 天   | 🔲 待实施 |

### 6.3 依赖关系

```
UUID v7 升级 ✅ ──────────────────────── 独立，已完成

内容审核 Layer 1 ✅ ──→ Layer 2 ✅ ──→ 审核队列 🔲
                                            │
                                            └── 依赖置信度 Prompt 改造

推荐 Phase 1 ✅ ──→ Phase 2 ✅ ──→ 排除待审核内容 🔲
                                        │
                                        └── 依赖审核队列的状态字段
```

---

## 七、环境变量汇总

```env
# ===== 智谱 AI（内容审核 + 推荐系统共用） =====
ZHIPU_API_KEY=                                  # https://open.bigmodel.cn 申请
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_MODEL=glm-4.7-flash                      # 内容审核用（免费）
ZHIPU_EMBEDDING_MODEL=embedding-3               # 推荐系统用

# ===== 内容审核 =====
MODERATION_ENABLED=true
MODERATION_TIMEOUT=10s

# ===== 推荐系统 =====
RECOMMENDATION_CACHE_TTL=5m
```

---

## 八、降级策略总览

```
                    智谱 AI 可用？
                         │
              ┌──────────┴──────────┐
              │ 是                   │ 否
              ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐
    │ 内容审核         │   │ 内容审核         │
    │ DFA + 智谱 AI    │   │ 仅 DFA 词库     │
    │ (支持置信度审核) │   │ (纯算法)        │
    └─────────────────┘   └─────────────────┘
    ┌─────────────────┐   ┌─────────────────┐
    │ 推荐系统         │   │ 推荐系统         │
    │ Embedding 语义   │   │ 规则评分算法     │
    │ + 多信号融合     │   │ 热度+时间+标签   │
    └─────────────────┘   └─────────────────┘
```

**不依赖任何本地模型（Ollama 等）。** 降级终点永远是纯算法 / 纯词库方案。

---

## 九、服务器部署配置

### 9.1 按预算选配

由于智谱 AI 免费，**最低配服务器即可享受完整 AI 能力**：

| 方案           | 服务器配置 | 可用功能                                      | 月成本（参考） |
| -------------- | ---------- | --------------------------------------------- | -------------- |
| **推荐方案** ⭐ | 1核2GB     | DFA + 智谱审核 + AI 推荐 + 审核队列（全功能） | **¥30**        |

### 9.2 本地开发 vs 生产环境

| 功能     | 本地开发                 | 生产环境          |
| -------- | ------------------------ | ----------------- |
| ID 生成  | UUID v7                  | UUID v7           |
| 内容审核 | NoopModerator（跳过）    | DFA + 智谱 AI     |
| 推荐系统 | 规则评分（无需 API Key） | 智谱 AI Embedding |
| 审核队列 | 不启用                   | 启用              |
| 智谱 AI  | 可选                     | 必须配置          |

---

## 十、风险与应对

| 风险                         | 概率 | 影响            | 应对措施                                      |
| ---------------------------- | ---- | --------------- | --------------------------------------------- |
| 智谱 AI 不可用               | 低   | 审核 + 推荐降级 | 自动降级：智谱 → DFA 词库 / 规则评分          |
| 智谱免费政策变更             | 低   | 成本增加        | 代码兼容 OpenAI 协议，可切换 DeepSeek 等备选  |
| AI 误判（过严/过松）         | 中   | 用户体验        | **人工审核队列** + Prompt 调优 + 审核日志分析 |
| pgvector 性能（> 10 万文章） | 低   | 推荐延迟        | IVFFlat 调优 + Redis 缓存                     |
| Embedding 生成延迟           | 低   | 发帖慢          | 异步生成，不阻塞主请求                        |
| UUID v7 时钟回拨             | 极低 | ID 乱序         | google/uuid 库内置单调递增保护                |

---

## 十一、变更日志

| 日期       | 版本   | 变更内容                                                                                                        | 作者 |
| ---------- | ------ | --------------------------------------------------------------------------------------------------------------- | ---- |
| 2026-03-01 | v1.0.0 | 创建后续开发计划，确定智谱 AI 为 LLM 首选方案                                                                   | X    |
| 2026-03-01 | v1.1.0 | Sprint 1 + Sprint 2 全部实施完成；移除 Ollama 降级方案，降级终点改为纯算法                                      | X    |
| 2026-03-01 | v1.2.0 | 新增第五章「人工审核队列」设计；AI 拿不准的内容推送管理员审核而非直接放行或拒绝；更新降级策略图；标记已完成任务 | X    |
