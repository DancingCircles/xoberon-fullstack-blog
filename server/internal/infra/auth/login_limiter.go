package auth

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	maxLoginAttempts = 5
	lockoutDuration  = 15 * time.Minute
)

// LoginLimiter 登录失败次数限制，防止暴力破解
type LoginLimiter interface {
	Check(ctx context.Context, username string) (locked bool, err error)
	RecordFailure(ctx context.Context, username string) error
	Reset(ctx context.Context, username string) error
}

// RedisLoginLimiter 基于 Redis 的实现
type RedisLoginLimiter struct {
	rdb *redis.Client
}

func NewRedisLoginLimiter(rdb *redis.Client) *RedisLoginLimiter {
	return &RedisLoginLimiter{rdb: rdb}
}

func (l *RedisLoginLimiter) key(username string) string {
	return fmt.Sprintf("login:fail:%s", username)
}

func (l *RedisLoginLimiter) Check(ctx context.Context, username string) (bool, error) {
	count, err := l.rdb.Get(ctx, l.key(username)).Int()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("login limiter redis get: %w", err)
	}
	return count >= maxLoginAttempts, nil
}

func (l *RedisLoginLimiter) RecordFailure(ctx context.Context, username string) error {
	k := l.key(username)
	pipe := l.rdb.Pipeline()
	pipe.Incr(ctx, k)
	pipe.Expire(ctx, k, lockoutDuration)
	_, err := pipe.Exec(ctx)
	return err
}

func (l *RedisLoginLimiter) Reset(ctx context.Context, username string) error {
	return l.rdb.Del(ctx, l.key(username)).Err()
}

// LocalLoginLimiter 本地内存实现（Redis 不可用时降级）
type LocalLoginLimiter struct {
	mu      sync.Mutex
	entries map[string]*localLoginEntry
	done    chan struct{}
}

type localLoginEntry struct {
	count    int
	expireAt time.Time
}

func NewLocalLoginLimiter() *LocalLoginLimiter {
	l := &LocalLoginLimiter{
		entries: make(map[string]*localLoginEntry),
		done:    make(chan struct{}),
	}
	go l.cleanup()
	return l
}

func (l *LocalLoginLimiter) Check(_ context.Context, username string) (bool, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	e, ok := l.entries[username]
	if !ok {
		return false, nil
	}
	if time.Now().After(e.expireAt) {
		delete(l.entries, username)
		return false, nil
	}
	return e.count >= maxLoginAttempts, nil
}

func (l *LocalLoginLimiter) RecordFailure(_ context.Context, username string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	e, ok := l.entries[username]
	if !ok || time.Now().After(e.expireAt) {
		l.entries[username] = &localLoginEntry{count: 1, expireAt: time.Now().Add(lockoutDuration)}
		return nil
	}
	e.count++
	return nil
}

func (l *LocalLoginLimiter) Reset(_ context.Context, username string) error {
	l.mu.Lock()
	delete(l.entries, username)
	l.mu.Unlock()
	return nil
}

func (l *LocalLoginLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			now := time.Now()
			l.mu.Lock()
			for k, e := range l.entries {
				if now.After(e.expireAt) {
					delete(l.entries, k)
				}
			}
			l.mu.Unlock()
		case <-l.done:
			return
		}
	}
}

func (l *LocalLoginLimiter) Close() {
	close(l.done)
}
