# XOBERON Web for Fullstack

这是全站版本中的前端应用，基于 React、TypeScript 和 Vite 构建。默认情况下它会连接后端 API；如需单独预览前端，也可以切换到 mock 模式。

## 数据模式

默认 `.env`：

```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:8080/api
```

可选 mock 模式：

```env
VITE_DATA_MODE=mock
```

- API 模式：通过 `src/services/realRuntime.ts` 请求后端。
- Mock 模式：通过 `src/services/mockRuntime.ts` 使用内置数据和 `localStorage`。
- 统一入口：业务组件只导入 `src/services/runtime.ts`，由环境变量决定运行时。

## 快速开始

```bash
cp .env.example .env
npm install
npm run dev
```

默认开发地址：

```text
http://127.0.0.1:5173
```

## 常用命令

```bash
npm run build
npm run preview
npm run lint
npm run test:run
npm run test:e2e
```

## 说明

独立前端 mock 发布版位于 `xoberon-web`。本目录属于 `xoberon-fullstack-blog`，用于和 `server/` 一起组成已对接后端的全站版本。
