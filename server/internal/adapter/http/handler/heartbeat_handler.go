package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"xoberon-server/internal/adapter/http/middleware"
)

const (
	onlineSetKey = "online:set"
	onlineKeyTTL = 60 * time.Second
)

// heartbeatScript 原子执行：SADD 到在线集合 + 设置独立过期 key
var heartbeatScript = redis.NewScript(`
local setKey  = KEYS[1]
local expKey  = KEYS[2]
local userID  = ARGV[1]
local ttl     = tonumber(ARGV[2])
redis.call('SADD', setKey, userID)
redis.call('SET', expKey, '1', 'EX', ttl)
return 1
`)

// cleanupScript 扫描 SET 成员，移除已过期的用户
var cleanupScript = redis.NewScript(`
local setKey = KEYS[1]
local prefix = ARGV[1]
local members = redis.call('SMEMBERS', setKey)
local removed = 0
for _, uid in ipairs(members) do
  if redis.call('EXISTS', prefix .. uid) == 0 then
    redis.call('SREM', setKey, uid)
    removed = removed + 1
  end
end
return removed
`)

type HeartbeatHandler struct {
	rdb *redis.Client
}

func NewHeartbeatHandler(rdb *redis.Client) *HeartbeatHandler {
	return &HeartbeatHandler{rdb: rdb}
}

func (h *HeartbeatHandler) Heartbeat(c *gin.Context) {
	if h.rdb == nil {
		c.Status(http.StatusNoContent)
		return
	}

	userID := middleware.GetUserID(c)
	uid := userID.String()
	expKey := "online:exp:" + uid

	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	heartbeatScript.Run(ctx, h.rdb,
		[]string{onlineSetKey, expKey},
		uid,
		int(onlineKeyTTL.Seconds()),
	)

	c.Status(http.StatusNoContent)
}

// OnlineCount 返回在线用户数，先清理过期成员再返回 SCARD
func (h *HeartbeatHandler) OnlineCount(c *gin.Context) {
	if h.rdb == nil {
		c.JSON(http.StatusOK, gin.H{"count": 0})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()

	cleanupScript.Run(ctx, h.rdb, []string{onlineSetKey}, "online:exp:")

	count, err := h.rdb.SCard(ctx, onlineSetKey).Result()
	if err != nil {
		count = 0
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}
