package noop

import (
	"context"
	"sync"
	"time"
)

// LocalRateLimiter Redis 不可用时的本地内存滑动窗口限流。
// 内置定期清理 goroutine，防止不再活跃的 key 导致内存无限增长。
type LocalRateLimiter struct {
	mu     sync.Mutex
	counts map[string][]int64
	limit  int
	window time.Duration
	done   chan struct{}
}

func NewLocalRateLimiter(limit int, window time.Duration) *LocalRateLimiter {
	rl := &LocalRateLimiter{
		counts: make(map[string][]int64),
		limit:  limit,
		window: window,
		done:   make(chan struct{}),
	}
	go rl.cleanup()
	return rl
}

func (rl *LocalRateLimiter) Allow(_ context.Context, key string) (bool, error) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now().UnixMilli()
	cutoff := now - rl.window.Milliseconds()

	timestamps := rl.counts[key]
	filtered := timestamps[:0]
	for _, ts := range timestamps {
		if ts > cutoff {
			filtered = append(filtered, ts)
		}
	}

	if len(filtered) >= rl.limit {
		rl.counts[key] = filtered
		return false, nil
	}

	rl.counts[key] = append(filtered, now)
	return true, nil
}

// cleanup 每 5 分钟清除窗口期外无活跃记录的 key
func (rl *LocalRateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			now := time.Now().UnixMilli()
			cutoff := now - rl.window.Milliseconds()
			rl.mu.Lock()
			for key, timestamps := range rl.counts {
				alive := false
				for _, ts := range timestamps {
					if ts > cutoff {
						alive = true
						break
					}
				}
				if !alive {
					delete(rl.counts, key)
				}
			}
			rl.mu.Unlock()
		case <-rl.done:
			return
		}
	}
}

func (rl *LocalRateLimiter) Close() {
	close(rl.done)
}
