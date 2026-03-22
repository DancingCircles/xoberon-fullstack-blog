package noop

import "context"

// NoopPostCache Redis 不可用时的降级缓存实现，所有操作均为空操作
type NoopPostCache struct{}

func NewNoopPostCache() *NoopPostCache { return &NoopPostCache{} }

func (n *NoopPostCache) GetDetail(_ context.Context, _ string) ([]byte, error) { return nil, nil }
func (n *NoopPostCache) GetList(_ context.Context, _ string) ([]byte, error)   { return nil, nil }
func (n *NoopPostCache) SetDetail(_ context.Context, _ string, _ interface{}) error { return nil }
func (n *NoopPostCache) SetList(_ context.Context, _ string, _ interface{}) error   { return nil }
func (n *NoopPostCache) SetNullMarker(_ context.Context, _ string) error            { return nil }
func (n *NoopPostCache) InvalidatePost(_ context.Context, _ string) error           { return nil }
func (n *NoopPostCache) InvalidateAll(_ context.Context) error                      { return nil }

// NoopEssayCache Redis 不可用时的随笔缓存降级实现
type NoopEssayCache struct{}

func NewNoopEssayCache() *NoopEssayCache { return &NoopEssayCache{} }

func (n *NoopEssayCache) GetDetail(_ context.Context, _ string) ([]byte, error) { return nil, nil }
func (n *NoopEssayCache) GetList(_ context.Context, _ string) ([]byte, error)   { return nil, nil }
func (n *NoopEssayCache) SetDetail(_ context.Context, _ string, _ interface{}) error { return nil }
func (n *NoopEssayCache) SetList(_ context.Context, _ string, _ interface{}) error   { return nil }
func (n *NoopEssayCache) SetNullMarker(_ context.Context, _ string) error            { return nil }
func (n *NoopEssayCache) InvalidateEssay(_ context.Context, _ string) error          { return nil }
func (n *NoopEssayCache) InvalidateAll(_ context.Context) error                      { return nil }
