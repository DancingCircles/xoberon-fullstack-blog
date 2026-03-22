package redis

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
)

// slidingWindowScript 用 Lua 脚本实现原子滑动窗口限流。
// 使用 Lua 保证 ZRemRangeByScore / ZAdd / ZCard / Expire 四步操作原子执行，
// 消除 Pipeline 模式下的高并发竞态条件。
var slidingWindowScript = redis.NewScript(`
local key     = KEYS[1]
local now     = tonumber(ARGV[1])
local window  = tonumber(ARGV[2])
local limit   = tonumber(ARGV[3])
local member  = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '0', tostring(now - window))
redis.call('ZADD', key, now, member)
local count = redis.call('ZCARD', key)
redis.call('EXPIRE', key, math.ceil(window / 1000))
return count
`)

// RateLimiter 基于 Redis Lua 脚本的原子滑动窗口限流器
type RateLimiter struct {
	rdb     *redis.Client
	limit   int
	window  time.Duration
	counter int64
}

func NewRateLimiter(rdb *redis.Client, limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{rdb: rdb, limit: limit, window: window}
}

// Allow 判断某个 key（如 IP+路径）是否在限流窗口内，使用 Lua 脚本保证原子性
func (rl *RateLimiter) Allow(ctx context.Context, key string) (bool, error) {
	rkey := fmt.Sprintf("ratelimit:%s", key)
	now := time.Now().UnixMilli()
	seq := atomic.AddInt64(&rl.counter, 1)
	member := fmt.Sprintf("%d:%d", now, seq)

	res, err := slidingWindowScript.Run(ctx, rl.rdb,
		[]string{rkey},
		now,
		rl.window.Milliseconds(),
		int64(rl.limit),
		member,
	).Int64()
	if err != nil {
		// Redis 故障时放行，避免因缓存问题阻断正常请求
		return true, err
	}

	return res <= int64(rl.limit), nil
}
