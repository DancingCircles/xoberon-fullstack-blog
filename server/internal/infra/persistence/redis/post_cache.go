package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	jitterMax      = 60 // TTL 随机抖动上限（秒）
	listVersionKey = "post:list:version"
)

// NullMarker 用于标识 DB 中不存在的 key，防止缓存穿透
var NullMarker = []byte("null")

// PostCache 文章缓存（存储序列化后的 JSON，避免缓存层依赖 domain 实体）
type PostCache struct {
	rdb            *redis.Client
	listTTL        time.Duration
	detailTTL      time.Duration
	nullMarkerTTL  time.Duration
}

func NewPostCache(rdb *redis.Client) *PostCache {
	return &PostCache{rdb: rdb, listTTL: 5 * time.Minute, detailTTL: 10 * time.Minute, nullMarkerTTL: 30 * time.Second}
}

func NewPostCacheWithTTL(rdb *redis.Client, listTTL, detailTTL, nullTTL time.Duration) *PostCache {
	return &PostCache{rdb: rdb, listTTL: listTTL, detailTTL: detailTTL, nullMarkerTTL: nullTTL}
}

// jitteredTTL 在 base TTL 上加随机偏移防止缓存雪崩
func jitteredTTL(base time.Duration) time.Duration {
	return base + time.Duration(rand.IntN(jitterMax))*time.Second
}

func (c *PostCache) listVersion(ctx context.Context) int64 {
	v, _ := c.rdb.Get(ctx, listVersionKey).Int64()
	return v
}

func (c *PostCache) versionedListKey(ctx context.Context, key string) string {
	return fmt.Sprintf("post:list:v%d:%s", c.listVersion(ctx), key)
}

// ---------- 读缓存 ----------

func (c *PostCache) GetList(ctx context.Context, key string) ([]byte, error) {
	data, err := c.rdb.Get(ctx, c.versionedListKey(ctx, key)).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	return data, err
}

func (c *PostCache) GetDetail(ctx context.Context, slug string) ([]byte, error) {
	data, err := c.rdb.Get(ctx, "post:detail:"+slug).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	return data, err
}

// ---------- 写缓存 ----------

func (c *PostCache) SetList(ctx context.Context, key string, data interface{}) error {
	b, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, c.versionedListKey(ctx, key), b, jitteredTTL(c.listTTL)).Err()
}

func (c *PostCache) SetDetail(ctx context.Context, slug string, data interface{}) error {
	b, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, "post:detail:"+slug, b, jitteredTTL(c.detailTTL)).Err()
}

// SetNullMarker 对 DB 中不存在的 slug 写入空值标记，短 TTL 防穿透
func (c *PostCache) SetNullMarker(ctx context.Context, slug string) error {
	return c.rdb.Set(ctx, "post:detail:"+slug, NullMarker, c.nullMarkerTTL).Err()
}

// ---------- 失效 ----------

// InvalidatePost 文章变更时清除相关缓存
func (c *PostCache) InvalidatePost(ctx context.Context, slug string) error {
	if err := c.rdb.Del(ctx, "post:detail:"+slug).Err(); err != nil {
		return err
	}
	return c.invalidateListCache(ctx)
}

// InvalidateAll 清除所有文章缓存
func (c *PostCache) InvalidateAll(ctx context.Context) error {
	return c.invalidateListCache(ctx)
}

func (c *PostCache) invalidateListCache(ctx context.Context) error {
	return c.rdb.Incr(ctx, listVersionKey).Err()
}
