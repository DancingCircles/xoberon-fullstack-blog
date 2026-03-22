package repository

import "context"

// PostCachePort 文章缓存抽象接口，UseCase 层依赖此接口而非具体 Redis 实现。
// 包含完整的 Cache-Aside 读写方法和失效方法。
type PostCachePort interface {
	// GetDetail 读取单篇文章缓存，返回 nil 表示未命中
	GetDetail(ctx context.Context, slug string) ([]byte, error)
	// GetList 读取列表缓存，返回 nil 表示未命中
	GetList(ctx context.Context, key string) ([]byte, error)
	// SetDetail 写入单篇文章缓存（data 会被 JSON 序列化）
	SetDetail(ctx context.Context, slug string, data interface{}) error
	// SetList 写入列表缓存（data 会被 JSON 序列化）
	SetList(ctx context.Context, key string, data interface{}) error
	// SetNullMarker 对 DB 中不存在的 slug 写入空值标记，短 TTL 防穿透
	SetNullMarker(ctx context.Context, slug string) error
	// InvalidatePost 清除指定文章缓存 + 所有列表缓存
	InvalidatePost(ctx context.Context, slug string) error
	// InvalidateAll 清除所有文章相关缓存
	InvalidateAll(ctx context.Context) error
}

// EssayCachePort 随笔缓存抽象接口，与 PostCachePort 同构。
type EssayCachePort interface {
	GetDetail(ctx context.Context, id string) ([]byte, error)
	GetList(ctx context.Context, key string) ([]byte, error)
	SetDetail(ctx context.Context, id string, data interface{}) error
	SetList(ctx context.Context, key string, data interface{}) error
	SetNullMarker(ctx context.Context, id string) error
	InvalidateEssay(ctx context.Context, id string) error
	InvalidateAll(ctx context.Context) error
}
