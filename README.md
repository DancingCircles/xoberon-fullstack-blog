# XOBERON Fullstack Blog

一个可公开运行、可二次开发、可拆分部署的全栈博客与作品集项目，采用 `React + TypeScript + Vite` 前端与 `Go + Gin + PostgreSQL + Redis` 后端。

项目同时覆盖：

- 个人主页与作品集展示
- 博客、随笔、评论与点赞交互
- 登录、注册、用户资料维护
- 管理后台、内容审核与在线状态
- 本地 mock 运行与真实后端接入两种模式

## 在线访问

- 线上地址：[xoberon.com](https://xoberon.com)
- GitHub 仓库：[DancingCircles/xoberon-fullstack-blog](https://github.com/DancingCircles/xoberon-fullstack-blog)

## 测试账户

如果你想直接体验公开站点，可以使用测试账户：

- 用户名：`xoberon`
- 密码：`Password123`

说明：

- 该账户仅用于公开演示。
- 如果你是本地运行前端 mock 版本，也可以直接使用同一组演示凭据。

## 核心特性

### 前端

- React 19 + TypeScript + Vite
- 丰富的页面动效、Three.js 展示与组件化结构
- 支持 `mock/localStorage` 独立运行
- 支持后续替换为你自己的 API 适配层

### 后端

- Go 1.25 + Gin
- PostgreSQL + Redis
- Clean Architecture + CQRS
- JWT 认证、限流、安全响应头、内容审核、推荐逻辑
- Prometheus 监控与容器化部署模板

### 测试

- 前端：Vitest + React Testing Library + Playwright
- 后端：`go test` + `govulncheck`

## 仓库结构

```text
xoberon-fullstack-blog/
├── web/      # 前端应用（React + TypeScript + Vite）
└── server/   # 后端服务（Go + Gin + PostgreSQL + Redis）
```

## 技术栈

- 前端：React 19、TypeScript、Vite、GSAP、Three.js
- 后端：Go 1.25、Gin、PostgreSQL、Redis、Prometheus
- 测试：Vitest、Playwright、Go test、govulncheck

## 快速开始

```bash
git clone https://github.com/DancingCircles/xoberon-fullstack-blog.git
cd xoberon-fullstack-blog
```

## 本地运行

### 方式一：仅运行前端

适合快速查看界面、交互、内容流与前端结构，不依赖你自己的后端。

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

默认开发地址：

- `http://127.0.0.1:5173`

### 方式二：运行完整后端

适合本地联调 API、认证、管理后台与数据层逻辑。

```bash
cd server
cp .env.example .env
docker compose up -d postgres redis
go run cmd/api/main.go
```

默认服务地址：

- API：`http://localhost:8080`
- 健康检查：`http://localhost:8080/api/health`

## 推荐开发方式

如果你是第一次接触这个项目，建议按以下顺序阅读和运行：

1. 先运行 `web/`，快速理解页面、交互和内容组织方式。
2. 再阅读 `web/src/services/mockRuntime.ts`，理解前端 mock 数据是如何工作的。
3. 如果需要完整后端能力，再启动 `server/`。
4. 最后根据自己的部署环境替换 `.env.example`、Nginx 配置和 CI 模板。

## 适合什么人

- 想找一个完整博客/作品集全栈模板的人
- 想学习 React + Go 全栈项目结构的人
- 想参考 Clean Architecture + CQRS 在博客系统中的落地方式的人
- 想把前端先跑起来，再逐步替换成自己后端的人

## 公开仓库说明

- `web/` 默认支持以 `mock/localStorage` 独立运行，适合直接预览 UI、交互与内容流。
- `server/` 提供完整后端实现，适合自建 API、认证、内容管理、审核与推荐能力。
- 本公开仓库不包含任何私有环境的真实密钥、证书或 `.env` 文件。
- README、`.env.example`、CI 与 Nginx 配置中的域名、路径和密钥均以公开模板为准，请按你自己的环境改写。

## 常用命令

### 前端

```bash
cd web
npm run build
npm run preview
npm run lint
npx tsc --noEmit
npm run test:run
npm run test:e2e
```

### 后端

```bash
cd server
make run
make dev
make test
make lint
make migrate-up
make docker-up
```

## 文档入口

- 前端说明：`web/README.md`
- 后端说明：`server/README.md`
- 根级安全策略：`SECURITY.md`
- 前端安全策略：`web/SECURITY.md`
- 后端安全策略：`server/SECURITY.md`
- 贡献说明：`CONTRIBUTING.md`

## License

本项目采用 [MIT License](./LICENSE)。
