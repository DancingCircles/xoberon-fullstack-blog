package noop

import (
	"context"
	"sync"
	"time"
)

type blacklistEntry struct {
	expireAt time.Time
}

// LocalTokenBlacklist Redis 不可用时的本地内存 Token 黑名单实现。
// 使用 sync.RWMutex + map 存储被撤销的 JTI，带 TTL 自动过期。
type LocalTokenBlacklist struct {
	mu      sync.RWMutex
	entries map[string]blacklistEntry
	done    chan struct{}
}

func NewLocalTokenBlacklist() *LocalTokenBlacklist {
	b := &LocalTokenBlacklist{
		entries: make(map[string]blacklistEntry),
		done:    make(chan struct{}),
	}
	go b.cleanup()
	return b
}

func (b *LocalTokenBlacklist) Revoke(_ context.Context, jti string, ttl time.Duration) error {
	b.mu.Lock()
	b.entries[jti] = blacklistEntry{expireAt: time.Now().Add(ttl)}
	b.mu.Unlock()
	return nil
}

func (b *LocalTokenBlacklist) IsRevoked(_ context.Context, jti string) (bool, error) {
	b.mu.RLock()
	entry, ok := b.entries[jti]
	b.mu.RUnlock()
	if !ok {
		return false, nil
	}
	if time.Now().After(entry.expireAt) {
		return false, nil
	}
	return true, nil
}

// cleanup 每 5 分钟清理过期条目，防止内存无限增长
func (b *LocalTokenBlacklist) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			now := time.Now()
			b.mu.Lock()
			for jti, entry := range b.entries {
				if now.After(entry.expireAt) {
					delete(b.entries, jti)
				}
			}
			b.mu.Unlock()
		case <-b.done:
			return
		}
	}
}

func (b *LocalTokenBlacklist) Close() {
	close(b.done)
}
