package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestID 为每个请求生成唯一追踪 ID，客户端传入的 ID 需通过格式校验
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if _, err := uuid.Parse(id); err != nil {
			id = uuid.New().String()
		}
		c.Header("X-Request-ID", id)
		c.Set("request_id", id)
		c.Next()
	}
}
