# Motionfolio Fullstack

<p align="center">
  <a href="#中文"><img alt="中文" src="https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-111111?style=for-the-badge"></a>
  <a href="#english"><img alt="English" src="https://img.shields.io/badge/README-English-111111?style=for-the-badge"></a>
</p>

<p align="center">
  <a href="https://blog.xoberon.com/home"><img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-blog.xoberon.com-0ea5e9?style=flat-square"></a>
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-React%20%2B%20Vite-61dafb?style=flat-square">
  <img alt="Backend" src="https://img.shields.io/badge/backend-Go%20%2B%20Gin-00add8?style=flat-square">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-111111?style=flat-square">
</p>

## 中文

Motionfolio Fullstack 是全站版作品集与博客平台：前端使用 React、TypeScript、Vite、GSAP 和 Three.js，后端使用 Go、Gin、PostgreSQL 与 Redis。它保留动效型前端体验，同时提供真实 API、用户认证、内容发布、评论、点赞、联系消息、后台审核与监控配置。

**在线预览**：<https://blog.xoberon.com/home>

### 适合展示

- React/Vite 前端与 Go/Gin API 的完整项目结构
- PostgreSQL 迁移、Redis 缓存、JWT 认证和内容审核流程
- 文章、随笔、评论、点赞、联系表单和后台管理工作流
- 前端支持 `api` 与 `mock` 两种数据模式，便于本地演示
- Docker Compose、Nginx、Prometheus/Grafana 配置示例

### 目录结构

```text
motionfolio-fullstack/
├── web/      # React frontend, defaults to API mode
└── server/   # Go API, migrations, Docker and monitoring config
```

### 快速开始

启动后端：

```bash
cd server
cp .env.example .env
docker compose up -d postgres redis
go run ./cmd/api
```

健康检查：

```text
http://localhost:8080/api/health
```

启动前端：

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

默认地址：

```text
Frontend: http://127.0.0.1:5173
API:      http://localhost:8080/api
```

### 数据模式

`web/.env.example` 默认连接 Go API：

```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:8080/api
```

如果只想临时预览前端，可以改为：

```env
VITE_DATA_MODE=mock
```

### 常用命令

```bash
# frontend
cd web
npm run lint
npm run test:run
npm run build

# backend
cd server
go test ./...
go run ./cmd/api
docker compose up -d
```

前端独立展示版：<https://github.com/DancingCircles/motionfolio-web>

作者署名：XOBERON

## English

Motionfolio Fullstack is the API-backed edition of the animated portfolio and journal platform. The frontend is built with React, TypeScript, Vite, GSAP, and Three.js; the backend is built with Go, Gin, PostgreSQL, and Redis. It keeps the motion-focused portfolio experience while adding real APIs, authentication, publishing, comments, likes, contact messages, admin review workflows, and monitoring configuration.

**Live demo**: <https://blog.xoberon.com/home>

### Why It Stands Out

- Complete React/Vite frontend and Go/Gin API structure
- PostgreSQL migrations, Redis caching, JWT auth, and moderation flow
- Posts, notes, comments, likes, contact messages, and admin workflows
- Frontend supports both `api` and `mock` data modes for local demos
- Docker Compose, Nginx, Prometheus, and Grafana configuration examples

### Structure

```text
motionfolio-fullstack/
├── web/      # React frontend, defaults to API mode
└── server/   # Go API, migrations, Docker and monitoring config
```

### Getting Started

Start the backend:

```bash
cd server
cp .env.example .env
docker compose up -d postgres redis
go run ./cmd/api
```

Health check:

```text
http://localhost:8080/api/health
```

Start the frontend:

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Default URLs:

```text
Frontend: http://127.0.0.1:5173
API:      http://localhost:8080/api
```

### Data Modes

`web/.env.example` defaults to the Go API:

```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:8080/api
```

For a frontend-only preview:

```env
VITE_DATA_MODE=mock
```

### Useful Commands

```bash
# frontend
cd web
npm run lint
npm run test:run
npm run build

# backend
cd server
go test ./...
go run ./cmd/api
docker compose up -d
```

Frontend-only edition: <https://github.com/DancingCircles/motionfolio-web>

Signature: XOBERON
