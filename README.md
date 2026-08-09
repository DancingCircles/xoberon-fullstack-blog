# Motionfolio Fullstack

Motionfolio 是 React/Vite + Go/Gin + PostgreSQL + Redis 构建的作品集与内容平台，包含注册登录、文章与随笔、评论、点赞、个人资料、联系表单、后台审核和监控。

## 路径一：完整 Compose（推荐）

需要 Docker Desktop / Docker Engine。默认只对本机开放统一入口 `http://127.0.0.1:8080`，PostgreSQL、Redis、Prometheus 和 Grafana 不暴露宿主机端口。

```bash
cp .env.example .env
docker compose up --build
```

该命令会依次等待 PostgreSQL、Redis，通过一次性 `migrate` 服务执行全部迁移；只有迁移成功后 API 才会启动，API 健康后 Nginx 网关才会就绪。前端生产构建固定使用：

```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=/api
```

验证：

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/api/health
docker compose ps
```

停止服务使用 `docker compose down`；不要添加 `-v`，即可在重启后保留数据库、Redis 和监控数据。需要从宿主机调试基础设施时，可使用开发覆盖：

```bash
docker compose -f compose.yml -f compose.dev.yml up --build
```

此时 PostgreSQL、Redis、Prometheus、Grafana 分别绑定到 `127.0.0.1:5432`、`6379`、`9090`、`3000`。

## 路径二：前后端独立开发

先启动并迁移基础设施：

```bash
docker compose -f compose.yml -f compose.dev.yml up -d postgres redis
docker compose run --rm migrate
```

后端：

```bash
cd server
cp .env.example .env
go run ./cmd/api
```

前端：

```bash
cd web
cp .env.example .env
npm ci
npm run dev
```

开发地址为 `http://127.0.0.1:5173`，API 健康检查为 `http://127.0.0.1:8080/api/health`。

## 交付检查

```bash
cd web
npm run lint
npx tsc --noEmit
npm run test:run
npm run build

cd ../server
gofmt -l .
go vet ./...
go test ./...
go test -race ./...
```

鉴权继续使用 Bearer JWT 并存放在 `localStorage`。应用启动时会通过 `/api/v1/users/me` 验证令牌，服务端也会在每个受保护请求中读取数据库当前用户和角色。`localStorage` 中的令牌仍可能被同源 XSS 读取，因此生产环境必须使用严格 CSP、避免不可信脚本，并通过 HTTPS 交付；本版本不包含 refresh token、多设备会话撤销、邮箱验证或找回密码。

默认 Compose 提供本地 HTTP。生产 TLS 应由部署环境的外部反向代理或单独覆盖配置负责。
