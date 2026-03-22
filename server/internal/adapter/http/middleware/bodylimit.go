package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// BodyLimit 限制请求体大小（字节）
func BodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}
