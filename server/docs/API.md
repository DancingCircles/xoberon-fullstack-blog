# XOBERON Server API 接口文档

> 作者: X
> 版本: v1.2.0
> 最后更新: 2026-03-01
> Base URL: `http://localhost:8080/api`

---

## 一、全局约定

### 1.1 请求格式

- Content-Type: `application/json`
- 认证：需要登录的接口通过 `Authorization: Bearer <token>` 传递 JWT

### 1.2 响应格式

**成功响应**：直接返回数据，不做额外包装。

```json
// 单个对象
{ "id": "uuid", "title": "..." }

// 列表（分页）
{
  "items": [{ ... }, { ... }],
  "total": 58,
  "page": 1,
  "page_size": 10
}
```

**错误响应**：统一结构 + HTTP 状态码。

```json
{
  "error": "VALIDATION_ERROR",
  "message": "标题不能为空"
}
```

### 1.3 HTTP 状态码对照

| 状态码 | 错误码             | 含义                           |
| ------ | ------------------ | ------------------------------ |
| 200    | -                  | 成功                           |
| 201    | -                  | 创建成功                       |
| 400    | `VALIDATION_ERROR` | 请求参数校验失败               |
| 401    | `UNAUTHORIZED`     | 未登录或 token 过期            |
| 403    | `FORBIDDEN`        | 无权限                         |
| 404    | `NOT_FOUND`        | 资源不存在                     |
| 409    | `CONFLICT`         | 唯一约束冲突（如用户名已存在） |
| 429    | `RATE_LIMITED`     | 请求频率超限                   |
| 500    | `INTERNAL_ERROR`   | 服务器内部错误                 |

### 1.4 分页参数

所有列表接口支持以下 Query 参数：

| 参数        | 类型 | 默认值 | 说明                |
| ----------- | ---- | ------ | ------------------- |
| `page`      | int  | 1      | 页码（从1开始）     |
| `page_size` | int  | 10     | 每页条数（最大100） |

---

## 二、认证接口

### 2.1 POST /api/auth/register — 用户注册

**权限：** 公开

**请求体：**

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "mypassword123",
  "name": "John Doe"
}
```

| 字段     | 类型   | 必填 | 校验规则       |
| -------- | ------ | ---- | -------------- |
| username | string | 是   | 3-50字符，唯一 |
| email    | string | 是   | 合法邮箱，唯一 |
| password | string | 是   | 8-72字符       |
| name     | string | 是   | 非空           |

**成功响应：** `201 Created`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "handle": "@johndoe",
    "bio": "",
    "avatar": "",
    "role": "user"
  }
}
```

**错误响应：**
- `400` — 参数校验失败
- `409` — 用户名或邮箱已存在

---

### 2.2 POST /api/auth/login — 用户登录

**权限：** 公开

**请求体：**

```json
{
  "username": "johndoe",
  "password": "mypassword123"
}
```

| 字段     | 类型   | 必填 | 说明   |
| -------- | ------ | ---- | ------ |
| username | string | 是   | 用户名 |
| password | string | 是   | 密码   |

**成功响应：** `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "handle": "@johndoe",
    "bio": "",
    "avatar": "",
    "role": "user"
  }
}
```

**错误响应：**
- `401` — 用户名或密码错误

---

### 2.3 POST /api/auth/logout — 登出

**权限：** 需要登录

**说明：** 将当前 token 加入黑名单，后续请求携带该 token 将返回 401。

**成功响应：** `200 OK`

```json
{ "message": "登出成功" }
```

**错误响应：**
- `401` — 未登录或 token 已失效

---

## 三、文章接口

### 3.1 GET /api/posts — 文章列表

**权限：** 公开

**Query 参数：**

| 参数      | 类型   | 必填 | 说明                                |
| --------- | ------ | ---- | ----------------------------------- |
| page      | int    | 否   | 页码，默认1                         |
| page_size | int    | 否   | 每页条数，默认10                    |
| category  | string | 否   | 分类筛选（Design / Tech / Culture） |
| tag       | string | 否   | 标签筛选                            |
| keyword   | string | 否   | 关键词搜索（标题+内容模糊匹配）     |

**成功响应：** `200 OK`

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Go 并发编程实践",
      "slug": "go-concurrency-practice",
      "excerpt": "本文介绍 Go 语言中常用的并发模式...",
      "content": "# Go 并发编程\n\n...",
      "created_at": "2026-02-28T10:00:00Z",
      "category": "Tech",
      "tags": ["Go", "Concurrency"],
      "read_time_minutes": 8,
      "like_count": 42,
      "author_name": "X",
      "author_avatar": "https://...",
      "comments": []
    }
  ],
  "total": 25,
  "page": 1,
  "page_size": 10
}
```

---

### 3.2 GET /api/posts/:slug — 文章详情

**权限：** 公开

**路径参数：**

| 参数 | 类型   | 说明          |
| ---- | ------ | ------------- |
| slug | string | 文章 URL 标识 |

**成功响应：** `200 OK`

```json
{
  "id": "uuid",
  "title": "Go 并发编程实践",
  "slug": "go-concurrency-practice",
  "excerpt": "...",
  "content": "# Go 并发编程\n\n完整 Markdown 内容...",
  "created_at": "2026-02-28T10:00:00Z",
  "category": "Tech",
  "tags": ["Go", "Concurrency"],
  "read_time_minutes": 8,
  "like_count": 42,
  "author_name": "X",
  "author_avatar": "https://...",
  "comments": [
    {
      "id": "uuid",
      "author": "Alice",
      "avatar": "https://...",
      "created_at": "2026-02-28T12:00:00Z",
      "content": "写得太好了！"
    }
  ]
}
```

**错误响应：**
- `404` — 文章不存在

---

### 3.3 POST /api/posts — 创建文章

**权限：** 需要登录

**请求体：**

```json
{
  "title": "Go 并发编程实践",
  "content": "# Go 并发编程\n\n这是一篇关于 Go 并发的文章...",
  "category": "Tech",
  "tags": ["Go", "Concurrency"]
}
```

| 字段     | 类型     | 必填 | 校验规则                                     |
| -------- | -------- | ---- | -------------------------------------------- |
| title    | string   | 是   | 1-30字符                                     |
| content  | string   | 是   | 20-2000字（Markdown 格式）                   |
| category | string   | 是   | Design / Tech / Culture                      |
| tags     | string[] | 否   | 最多3个，每个最多30字符                      |

**成功响应：** `201 Created`

返回完整的文章对象（同 3.2 的响应结构，不含 comments）。

**错误响应：**
- `400` — 参数校验失败
- `401` — 未登录
- `409` — slug 冲突

---

### 3.4 PUT /api/posts/:id — 编辑文章

**权限：** 需要登录（仅作者或管理员）

**请求体：** 同 3.3

**成功响应：** `200 OK` — 返回更新后的文章对象

**错误响应：**
- `400` — 参数校验失败
- `401` — 未登录
- `403` — 无权编辑（非作者且非管理员）
- `404` — 文章不存在

---

### 3.5 DELETE /api/posts/:id — 删除文章

**权限：** 需要登录（仅作者或管理员）

**成功响应：** `200 OK`

```json
{ "message": "删除成功" }
```

**错误响应：**
- `401` — 未登录
- `403` — 无权删除
- `404` — 文章不存在

---

### 3.6 POST /api/posts/:id/like — 点赞/取消点赞文章

**权限：** 需要登录

**成功响应：** `200 OK`

```json
{
  "liked": true,
  "like_count": 43
}
```

> `liked` 为 `true` 表示点赞成功，`false` 表示取消点赞。

---

## 四、评论接口

### 4.1 GET /api/posts/:id/comments — 获取文章评论列表

**权限：** 公开

**成功响应：** `200 OK`

```json
[
  {
    "id": "uuid",
    "author": "Alice",
    "avatar": "https://...",
    "created_at": "2026-02-28T12:00:00Z",
    "content": "写得太好了！"
  }
]
```

---

### 4.2 POST /api/posts/:id/comments — 发表评论

**权限：** 需要登录

**请求体：**

```json
{
  "content": "这篇文章写得很好，学到了很多！"
}
```

| 字段    | 类型   | 必填 | 校验规则   |
| ------- | ------ | ---- | ---------- |
| content | string | 是   | 1-2000字符 |

**成功响应：** `201 Created`

```json
{
  "id": "uuid",
  "author": "Alice",
  "avatar": "https://...",
  "created_at": "2026-02-28T14:30:00Z",
  "content": "这篇文章写得很好，学到了很多！"
}
```

---

## 五、随笔接口

### 5.1 GET /api/essays — 随笔列表

**权限：** 公开

**Query 参数：** `page`, `page_size`

**成功响应：** `200 OK`

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "深夜随想",
      "excerpt": "今天想聊聊关于...",
      "content": "完整内容...",
      "created_at": "2026-02-28T23:00:00Z",
      "like_count": 15,
      "author_name": "X",
      "author_avatar": "https://..."
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 10
}
```

---

### 5.2 GET /api/essays/:id — 随笔详情

**权限：** 公开

**成功响应：** `200 OK` — 同列表中单项结构

**错误响应：**
- `404` — 随笔不存在

---

### 5.3 POST /api/essays — 创建随笔

**权限：** 需要登录

**请求体：**

```json
{
  "title": "深夜随想",
  "excerpt": "今天想聊聊关于...",
  "content": "完整的随笔内容..."
}
```

| 字段    | 类型   | 必填 | 校验规则                              |
| ------- | ------ | ---- | ------------------------------------- |
| title   | string | 是   | 1-20字符                              |
| excerpt | string | 否   | 最多30字符，为空则自动从 content 截取 |
| content | string | 是   | 10-500字                              |

**成功响应：** `201 Created`

---

### 5.4 PUT /api/essays/:id — 编辑随笔

**权限：** 需要登录（仅作者或管理员）

**请求体：** 同 5.3

**成功响应：** `200 OK`

---

### 5.5 DELETE /api/essays/:id — 删除随笔

**权限：** 需要登录（仅作者或管理员）

**成功响应：** `200 OK`

```json
{ "message": "删除成功" }
```

---

### 5.6 POST /api/essays/:id/like — 点赞/取消点赞随笔

**权限：** 需要登录

**成功响应：** `200 OK`

```json
{
  "liked": true,
  "like_count": 16
}
```

---

## 六、用户接口

### 6.1 GET /api/users/:handle — 获取用户公开资料

**权限：** 公开

**路径参数：**

| 参数   | 类型   | 说明                       |
| ------ | ------ | -------------------------- |
| handle | string | 用户 handle（如 @johndoe） |

**成功响应：** `200 OK`

```json
{
  "id": "uuid",
  "name": "John Doe",
  "handle": "@johndoe",
  "bio": "全栈开发者",
  "avatar": "https://...",
  "role": "user",
  "post_count": 12,
  "essay_count": 5
}
```

---

### 6.2 PUT /api/users/me — 修改个人资料

**权限：** 需要登录

**请求体：**

```json
{
  "name": "John Doe",
  "bio": "更新后的个人简介",
  "avatar": "https://new-avatar-url.com/img.jpg"
}
```

| 字段   | 类型   | 必填 | 说明     |
| ------ | ------ | ---- | -------- |
| name   | string | 是   | 非空     |
| bio    | string | 否   | 个人简介 |
| avatar | string | 否   | 头像 URL |

**成功响应：** `200 OK` — 返回更新后的用户资料

---

## 七、联系表单接口

### 7.1 POST /api/contact — 提交联系消息

**权限：** 公开

**请求体：**

```json
{
  "name": "访客",
  "email": "visitor@example.com",
  "message": "你好，我想合作..."
}
```

| 字段    | 类型   | 必填 | 校验规则   |
| ------- | ------ | ---- | ---------- |
| name    | string | 是   | 非空       |
| email   | string | 是   | 合法邮箱   |
| message | string | 是   | 1-5000字符 |

**成功响应：** `201 Created`

```json
{ "message": "消息已发送" }
```

---

## 八、推荐与阅读行为接口

### 8.1 GET /api/posts/recommendations — 获取推荐文章

**权限：** 公开（可选登录，登录后推荐更精准）

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| limit | int | 否 | 推荐数量，默认5 |
| exclude | string | 否 | 排除的文章 ID，逗号分隔 |

**说明：**
- 匿名用户：使用规则评分算法（热度 + 时间 + 标签）
- 登录用户 + 智谱 AI 可用：使用 Embedding 语义推荐 + 多信号融合
- 登录用户 + 智谱 AI 不可用：降级为规则评分算法

**成功响应：** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Go 并发编程实践",
      "slug": "go-concurrency-practice",
      "excerpt": "...",
      "content": "...",
      "created_at": "2026-02-28T10:00:00Z",
      "category": "Tech",
      "tags": ["Go", "Concurrency"],
      "read_time_minutes": 8,
      "like_count": 42,
      "author_name": "X",
      "author_avatar": "https://...",
      "comments": []
    }
  ],
  "meta": {
    "algorithm": "score_based"
  }
}
```

> `meta.algorithm` 可能为 `"score_based"` 或 `"zhipu_embedding"`，表示本次使用的推荐算法。

---

### 8.2 POST /api/posts/:id/view — 记录阅读行为

**权限：** 需要登录

**路径参数：**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID | 文章 ID |

**说明：** 记录用户阅读事件，用于推荐系统的行为数据采集。同一用户对同一文章仅记录一次（UPSERT）。

**成功响应：** `200 OK`

```json
{ "message": "ok" }
```

**错误响应：**
- `400` — 无效的文章 ID
- `401` — 未登录

---

## 九、管理员接口

> 前缀: `/api/admin/`
> 权限: 需要登录 + role 为 admin

### 9.1 GET /api/admin/users — 用户列表

**Query 参数：** `page`, `page_size`

**成功响应：** `200 OK` — 分页用户列表

---

### 9.2 PUT /api/admin/users/:id/role — 修改用户角色

**请求体：**

```json
{
  "role": "admin"
}
```

**成功响应：** `200 OK`

---

### 9.3 DELETE /api/admin/posts/:id — 强制删除文章（待实现）

> **状态：** 路由尚未注册，计划在人工审核队列实施时一并添加。

---

### 9.4 DELETE /api/admin/comments/:id — 删除评论（待实现）

> **状态：** 路由尚未注册，计划在人工审核队列实施时一并添加。

---

### 9.5 GET /api/admin/contacts — 查看联系消息

**Query 参数：** `page`, `page_size`

**成功响应：** `200 OK` — 分页消息列表

---

### 9.6 PUT /api/admin/contacts/:id/read — 标记消息已读

**成功响应：** `200 OK`

---

## 十、前端 DTO 映射对照表

后端响应字段（snake_case）与前端类型（camelCase）的对应关系：

### Post

| 后端字段            | 前端字段        | 说明                |
| ------------------- | --------------- | ------------------- |
| `id`                | `id`            |                     |
| `title`             | `title`         |                     |
| `slug`              | `slug`          |                     |
| `excerpt`           | `excerpt`       |                     |
| `content`           | `content`       | Markdown 原文       |
| `created_at`        | `date`          | 前端 service 层映射 |
| `category`          | `category`      |                     |
| `tags`              | `tags`          |                     |
| `read_time_minutes` | `readTime`      |                     |
| `like_count`        | `likes`         |                     |
| `author_name`       | `author.name`   | 前端组装为嵌套对象  |
| `author_avatar`     | `author.avatar` |                     |
| `comments`          | `comments`      |                     |

### Essay

| 后端字段        | 前端字段        |
| --------------- | --------------- |
| `id`            | `id`            |
| `title`         | `title`         |
| `excerpt`       | `excerpt`       |
| `content`       | `content`       |
| `created_at`    | `date`          |
| `like_count`    | `likes`         |
| `author_name`   | `author.name`   |
| `author_avatar` | `author.avatar` |

### User

| 后端字段      | 前端字段     |
| ------------- | ------------ |
| `id`          | `id`         |
| `name`        | `name`       |
| `handle`      | `handle`     |
| `bio`         | `bio`        |
| `avatar`      | `avatar`     |
| `role`        | `role`       |
| `post_count`  | `postCount`  |
| `essay_count` | `essayCount` |
