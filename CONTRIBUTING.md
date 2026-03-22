# Contributing

感谢你关注这个项目。

## 开发环境

### 前端

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

### 后端

```bash
cd server
cp .env.example .env
docker compose up -d postgres redis
go run cmd/api/main.go
```

## 提交前检查

### 前端

```bash
cd web
npm run lint
npx tsc --noEmit
npm run test:run
```

### 后端

```bash
cd server
go test ./... -race -count=1
```

如果你的环境已安装工具，建议额外执行：

```bash
cd server
golangci-lint run
govulncheck ./...
```

## 贡献约定

- 不要提交 `.env`、证书、私钥、数据库备份和本地构建产物。
- 前端改动放在 `web/`，后端改动放在 `server/`。
- 涉及 API、schema 或配置变更时，请同步更新对应目录的文档与模板文件。
- 保持目录边界清晰，不要把前后端职责混在一起。
