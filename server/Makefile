.PHONY: run build test lint migrate-up migrate-down migrate-create tidy docker-up docker-down

# 默认 .env 文件路径
ENV_FILE ?= .env

# Go 构建参数
BINARY_NAME = xoberon-server
BUILD_DIR = ./bin

# ---- 开发 ----

run:
	go run cmd/api/main.go

dev:
	air

build:
	go build -o $(BUILD_DIR)/$(BINARY_NAME) cmd/api/main.go

tidy:
	go mod tidy

test:
	go test ./... -v -race -count=1

lint:
	golangci-lint run ./...

# ---- 数据库迁移 ----

DB_DSN ?= postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)

migrate-up:
	migrate -path migrations -database "$(DB_DSN)" up

migrate-down:
	migrate -path migrations -database "$(DB_DSN)" down 1

migrate-create:
	@read -p "Migration name: " name; \
	migrate create -ext sql -dir migrations -seq $$name

# ---- Docker ----

docker-up:
	docker compose up -d postgres redis

docker-down:
	docker compose down

docker-all:
	docker compose up -d --build
