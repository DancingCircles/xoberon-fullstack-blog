package middleware

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"xoberon-server/internal/adapter/http/dto"
)

// RateLimitFunc 限流判断函数，传入标识 key，返回是否放行
type RateLimitFunc func(ctx context.Context, key string) (allowed bool, err error)

// RateLimit 限流中间件，基于客户端 IP 限流
func RateLimit(fn RateLimitFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		if fn == nil {
			c.Next()
			return
		}

		key := "rl:" + c.ClientIP() + ":" + c.Request.Method + ":" + c.FullPath()
		allowed, err := fn(c.Request.Context(), key)
		if err != nil {
			c.Next()
			return
		}
		if !allowed {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, dto.ErrorResp{
				Error:   "RATE_LIMITED",
				Message: "请求过于频繁，请稍后再试",
			})
			return
		}

		c.Next()
	}
}
