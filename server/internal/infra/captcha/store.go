package captcha

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	keyPrefix = "captcha:"
	ttl       = 5 * time.Minute
)

// RedisStore 使用 Redis 存储验证码，实现 base64Captcha.Store 接口。
type RedisStore struct {
	rdb *redis.Client
}

func NewRedisStore(rdb *redis.Client) *RedisStore {
	return &RedisStore{rdb: rdb}
}

func (s *RedisStore) Set(id string, value string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return s.rdb.Set(ctx, fmt.Sprintf("%s%s", keyPrefix, id), value, ttl).Err()
}

func (s *RedisStore) Get(id string, clear bool) string {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	key := fmt.Sprintf("%s%s", keyPrefix, id)

	if clear {
		val, err := s.rdb.GetDel(ctx, key).Result()
		if err != nil {
			return ""
		}
		return val
	}

	val, err := s.rdb.Get(ctx, key).Result()
	if err != nil {
		return ""
	}
	return val
}

func (s *RedisStore) Verify(id, answer string, clear bool) bool {
	stored := s.Get(id, clear)
	if stored == "" {
		return false
	}
	return stored == answer
}
