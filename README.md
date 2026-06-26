# XOBERON Fullstack Blog

XOBERON 的全站发布版，包含已经对接后端 API 的前端应用和 Go 后端服务。这个仓库用于展示完整的前后端项目结构；如果只需要独立前端或独立后端，请分别使用 `xoberon-web` 和 `xoberon-server`。

## 版本定位

- 发布版本：`v1.0.0`
- 发布形态：全站版本
- 前端：React、TypeScript、Vite
- 后端：Go、Gin、PostgreSQL、Redis
- 默认数据模式：前端请求后端 API
- 可选数据模式：`VITE_DATA_MODE=mock` 时使用前端内置 mock 数据

## 目录结构

```text
xoberon-fullstack-blog/
├─ web/      # 前端应用，默认对接 /api
└─ server/   # Go API 服务、数据库迁移、Docker 配置和监控配置
```

## 快速开始

### 1. 启动后端

```bash
cd server
cp .env.example .env
docker compose up -d postgres redis
go run ./cmd/api
```

后端健康检查：

```text
http://localhost:8080/api/health
```

如果本机没有安装 Go，也可以直接使用 Docker Compose 启动完整后端栈：

```bash
cd server
cp .env.example .env
docker compose up -d
```

### 2. 启动前端

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

默认前端地址：

```text
http://127.0.0.1:5173
```

默认 API 地址：

```text
http://localhost:8080/api
```

## 前端数据模式

`web/.env.example` 默认使用真实 API：

```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:8080/api
```

如果只想临时预览前端，不启动后端，可以改成：

```env
VITE_DATA_MODE=mock
```

mock 模式会使用 `web/src/services/mockRuntime.ts` 和浏览器 `localStorage`。API 模式会通过 `web/src/services/realRuntime.ts` 对接 `server` 中的真实接口。

## 相关仓库

| 仓库 | 形态 | 说明 |
| --- | --- | --- |
| `xoberon-web` | 独立前端 | 纯 mock 数据，适合前端展示 |
| `xoberon-server` | 独立后端 | Go API 服务，适合后端发布 |
| `xoberon-fullstack-blog` | 全站 | 前端默认连接后端 API |

## 常用命令

前端：

```bash
cd web
npm run build
npm run lint
npm run test:run
```

后端：

```bash
cd server
go test ./...
go run ./cmd/api
docker compose up -d
```

## 公开发布说明

仓库中的 `.env.example` 和 Nginx 配置只保留占位示例，不包含真实生产密钥、真实生产域名或私有部署信息。部署前需要在自己的服务器或 CI/CD 环境中补齐实际环境变量、数据库密码、JWT 密钥、证书路径和允许的 CORS 域名。

## License

MIT
