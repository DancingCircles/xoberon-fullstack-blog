package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const essayListVersionKey = "essay:list:version"

type EssayCache struct {
	rdb           *redis.Client
	listTTL       time.Duration
	detailTTL     time.Duration
	nullMarkerTTL time.Duration
}

func NewEssayCache(rdb *redis.Client) *EssayCache {
	return &EssayCache{rdb: rdb, listTTL: 5 * time.Minute, detailTTL: 10 * time.Minute, nullMarkerTTL: 30 * time.Second}
}

func NewEssayCacheWithTTL(rdb *redis.Client, listTTL, detailTTL, nullTTL time.Duration) *EssayCache {
	return &EssayCache{rdb: rdb, listTTL: listTTL, detailTTL: detailTTL, nullMarkerTTL: nullTTL}
}

func (c *EssayCache) listVersion(ctx context.Context) int64 {
	v, _ := c.rdb.Get(ctx, essayListVersionKey).Int64()
	return v
}

func (c *EssayCache) versionedListKey(ctx context.Context, key string) string {
	return fmt.Sprintf("essay:list:v%d:%s", c.listVersion(ctx), key)
}

func (c *EssayCache) GetList(ctx context.Context, key string) ([]byte, error) {
	data, err := c.rdb.Get(ctx, c.versionedListKey(ctx, key)).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	return data, err
}

func (c *EssayCache) GetDetail(ctx context.Context, id string) ([]byte, error) {
	data, err := c.rdb.Get(ctx, "essay:detail:"+id).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	return data, err
}

func (c *EssayCache) SetList(ctx context.Context, key string, data interface{}) error {
	b, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, c.versionedListKey(ctx, key), b, jitteredTTL(c.listTTL)).Err()
}

func (c *EssayCache) SetDetail(ctx context.Context, id string, data interface{}) error {
	b, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, "essay:detail:"+id, b, jitteredTTL(c.detailTTL)).Err()
}

func (c *EssayCache) SetNullMarker(ctx context.Context, id string) error {
	return c.rdb.Set(ctx, "essay:detail:"+id, NullMarker, c.nullMarkerTTL).Err()
}

func (c *EssayCache) InvalidateEssay(ctx context.Context, id string) error {
	if err := c.rdb.Del(ctx, "essay:detail:"+id).Err(); err != nil {
		return err
	}
	return c.invalidateListCache(ctx)
}

func (c *EssayCache) InvalidateAll(ctx context.Context) error {
	return c.invalidateListCache(ctx)
}

func (c *EssayCache) invalidateListCache(ctx context.Context) error {
	return c.rdb.Incr(ctx, essayListVersionKey).Err()
}
