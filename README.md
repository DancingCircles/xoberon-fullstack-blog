# XOBERON Fullstack Blog

一个可公开运行与二次开发的全栈博客与作品集项目，采用 `React + TypeScript + Vite` 前端与 `Go + Gin + PostgreSQL + Redis` 后端。

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

### 运行前端

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

### 运行后端

```bash
cd server
cp .env.example .env
docker compose up -d postgres redis
go run cmd/api/main.go
```

## 项目定位

- `web/` 默认支持以 `mock/localStorage` 独立运行，适合直接预览 UI、交互与内容流。
- `server/` 提供完整后端实现，适合自建 API、认证、内容管理、审核与推荐能力。
- 公开仓库不包含任何私有环境的真实密钥、证书或 `.env` 文件。

## 文档入口

- 前端说明：`web/README.md`
- 后端说明：`server/README.md`
- 前端安全策略：`web/SECURITY.md`
- 后端安全策略：`server/SECURITY.md`

## License

本项目采用 [MIT License](./LICENSE)。
