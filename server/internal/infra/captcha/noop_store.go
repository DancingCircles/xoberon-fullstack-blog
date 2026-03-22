package captcha

import (
	"sync"
	"time"
)

type entry struct {
	value     string
	expiresAt time.Time
}

// NoopStore 是 Redis 不可用时的内存降级实现。
type NoopStore struct {
	data   sync.Map
	stopCh chan struct{}
}

func NewNoopStore() *NoopStore {
	s := &NoopStore{stopCh: make(chan struct{})}
	go s.cleanup()
	return s
}

func (s *NoopStore) Set(id string, value string) error {
	s.data.Store(id, entry{value: value, expiresAt: time.Now().Add(ttl)})
	return nil
}

func (s *NoopStore) Get(id string, clear bool) string {
	raw, ok := s.data.Load(id)
	if !ok {
		return ""
	}
	e := raw.(entry)
	if time.Now().After(e.expiresAt) {
		s.data.Delete(id)
		return ""
	}
	if clear {
		s.data.Delete(id)
	}
	return e.value
}

func (s *NoopStore) Verify(id, answer string, clear bool) bool {
	stored := s.Get(id, clear)
	if stored == "" {
		return false
	}
	return stored == answer
}

func (s *NoopStore) Close() {
	close(s.stopCh)
}

func (s *NoopStore) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			now := time.Now()
			s.data.Range(func(key, value any) bool {
				if now.After(value.(entry).expiresAt) {
					s.data.Delete(key)
				}
				return true
			})
		}
	}
}
