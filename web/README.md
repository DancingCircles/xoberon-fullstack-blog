# XOBERON Web

公开版前端作品集与博客站点，基于 React + TypeScript + Vite 构建，默认以 `mock/localStorage` 驱动完整交互，不依赖任何私有后端即可运行。

> 作者：X
> 公开版说明：当前仓库面向前端开源与本地演示，后端实现、真实 API 细节与生产运维信息不包含在公开说明中。

## 特性

- 首页、博客、随笔、作者页、搜索页与联系页均可独立运行。
- 登录、注册、点赞、评论、发布内容、后台浏览等交互改为本地 mock 持久化。
- `assets/data/` 提供初始种子数据，`services/mockRuntime.ts` 负责公开版运行时的数据读写。
- 公开仓库不包含私有后端实现、真实 API 契约或生产部署细节。

## 快速开始

```bash
git clone https://github.com/DancingCircles/xoberon-fullstack-blog.git
cd xoberon-fullstack-blog/web
npm install
cp .env.example .env
npm run dev
```

默认开发地址为 `http://127.0.0.1:5173`。

常用命令：

```bash
npm run build
npm run preview
npm run lint
npx tsc --noEmit
npm run test:run
npm run test:e2e
```

## 演示账号

公开版内置本地演示账号，所有数据保存在浏览器 `localStorage`：

- 用户名：`xoberon`
- 密码：`Password123`

你也可以直接注册新账号，注册、登录、资料更新、发布与点赞都会写入本地浏览器存储。

## 数据模式

当前仓库采用 `Mock-First` 运行方式：

- `src/assets/data/`：维护初始文章、随笔、作者与类型定义。
- `src/services/mockRuntime.ts`：公开版运行时，负责 mock 登录、内容 CRUD、评论、点赞、联系消息、后台统计等。
- `src/contexts/auth/`、`src/contexts/data/`、`src/contexts/likes/`：统一消费本地运行时，不再要求启动服务端。

如果你想把这个前端接入自己的后端，建议按以下方式处理：

1. 保留 `components/`、`contexts/`、`pages/` 的现有 UI 结构不动。
2. 在 `services/` 内实现你自己的适配层和 DTO 映射。
3. 只暴露你愿意公开的环境变量，不要把真实生产地址、管理端接口或部署细节写进公开仓库。

## 可选配置

公开版没有必填环境变量，`.env.example` 仅保留占位说明。

如果你未来要接入自己的服务端，请在私有本地 `.env` 中自行定义 `VITE_API_BASE_URL`。

## 项目结构

```text
web/
├── public/
├── src/
│   ├── app/                 # 应用入口与路由
│   ├── assets/data/         # 类型与 mock 种子数据
│   ├── components/          # 业务与通用组件
│   ├── contexts/            # Auth / Data / Likes / Toast / Lenis
│   ├── hooks/               # 自定义 Hooks
│   ├── pages/               # 页面级组件
│   ├── services/            # 运行时适配层与边界
│   ├── styles/              # 全局样式与设计令牌
│   └── test/                # 测试基础设施
├── e2e/
└── docs/
```

推荐优先阅读：

- `src/services/mockRuntime.ts`
- `src/contexts/data/DataProvider.tsx`
- `src/contexts/auth/AuthProvider.tsx`
- `src/assets/data/mockData.ts`

## 测试

项目包含单元测试、组件测试和 E2E 测试。

- `npm run test:run`：单次运行 Vitest
- `npm run test:coverage`：输出覆盖率
- `npm run test:e2e`：运行 Playwright

测试文档仅保留公开版运行与验证方式，不包含私有后端、安全策略和运维实现细节。

## 开发约定

- 组件采用“一组件一目录”结构。
- 共享类型集中在 `src/assets/data/types.ts`。
- 自定义 Hook 放在 `src/hooks/`，使用命名导出。
- 样式统一走 `global.css` 中的设计令牌。
- 模态框统一使用 `useBodyScrollLock()`、ESC 关闭与 `createPortal()`。

## 开源边界

本仓库公开的是前端体验、组件组织、动效实现与 mock 数据驱动方式。

以下内容不在公开说明范围内：

- 私有服务端实现细节
- 真实 API 路由与管理接口设计
- 生产环境拓扑、域名、密钥、监控、迁移与运维信息

如果你打算自建配套服务，请根据自己的部署环境与安全要求单独设计配置与文档。

## License

本项目采用仓库根目录下的 [MIT License](../LICENSE)。
