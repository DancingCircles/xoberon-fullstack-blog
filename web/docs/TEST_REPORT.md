# 前端验证记录

更新时间：2026-08-10

本文件只记录当前工作树实际执行过的命令，不保留历史估算通过率。

| 命令 | 结果 |
|---|---|
| `npm ci`（Node 22 Alpine 干净容器） | 通过 |
| `npm run lint` | 通过 |
| `npx tsc --noEmit` | 通过 |
| `npm run build` | 通过，1844 个模块完成生产构建 |
| `npm run test:run -- --reporter=dot` | 通过，53 个测试文件、278 个测试全部通过 |
| `docker compose build gateway` | 通过，构建参数固定为 API 模式与同域 `/api` |

单元测试已移除会调用 `process.exit(0)` 的全局 teardown 与外层超时包装，`test:run` 现在直接执行 `vitest run`。修复保护路由测试中的无目标路由重定向循环后，全量测试以真实退出码 `0` 完成。Vitest 使用单 worker fork 隔离，CI 保留整体作业超时，超时或 worker 异常会真实失败。

构建存在两个非阻断警告：`lottie-web` 使用 `eval`，以及主 bundle 超过 500 kB。本轮未扩大到性能拆包。
