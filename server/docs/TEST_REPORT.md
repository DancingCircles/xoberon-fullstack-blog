# 后端验证记录

更新时间：2026-08-10

本文件只记录当前工作树实际执行过的命令，不包含历史通过率或估算覆盖率。

| 命令 | 环境 | 结果 |
|---|---|---|
| `gofmt -l .`（全部 Go 文件） | `golang:1.25-alpine` | 通过，无未格式化文件 |
| `go vet ./...` | `golang:1.25-alpine` | 通过 |
| `go test ./...` | `golang:1.25-alpine` | 通过 |
| `CGO_ENABLED=1 go test -race ./...` | `golang:1.25-alpine` + GCC | 通过 |
| `docker compose build api gateway` | Docker Engine 29.4.1 | 通过 |
| 全新卷 `docker compose up -d` | Docker Engine 29.4.1 | 通过；迁移、API、网关逐级就绪 |
| 再次执行 migration | Docker Engine 29.4.1 | 通过，输出 `no change` |

Compose 冒烟结果：

- `/health` 与 `/api/health` 返回成功。
- 匿名 `POST /api/v1/contact` 返回 `201` 和“消息已发送”。
- `GET /api/v1/posts?page=1&page_size=20` 返回标准分页对象。
- 首次使用基础 PostgreSQL 镜像时，第 6 个迁移因缺少 pgvector 正确失败且 API 未启动；数据库镜像改为 `pgvector/pgvector:pg17` 后从全新卷完整通过。

尚未在本次记录中执行：真实浏览器 Playwright 全链路。
