package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// TokenBlacklist token 撤销接口
type TokenBlacklist interface {
	Revoke(ctx context.Context, jti string, ttl time.Duration) error
	IsRevoked(ctx context.Context, jti string) (bool, error)
}

// RedisTokenBlacklist 基于 Redis 的 token 黑名单
type RedisTokenBlacklist struct {
	rdb *redis.Client
}

func NewRedisTokenBlacklist(rdb *redis.Client) *RedisTokenBlacklist {
	return &RedisTokenBlacklist{rdb: rdb}
}

func (b *RedisTokenBlacklist) Revoke(ctx context.Context, jti string, ttl time.Duration) error {
	key := fmt.Sprintf("jwt:blacklist:%s", jti)
	return b.rdb.Set(ctx, key, "1", ttl).Err()
}

func (b *RedisTokenBlacklist) IsRevoked(ctx context.Context, jti string) (bool, error) {
	key := fmt.Sprintf("jwt:blacklist:%s", jti)
	n, err := b.rdb.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return n > 0, nil
}
