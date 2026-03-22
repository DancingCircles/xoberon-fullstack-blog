package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"xoberon-server/internal/adapter/http/dto"
)

// Recover panic 恢复中间件
func Recover(log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Error("PANIC_RECOVERED",
					zap.Any("error", r),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
					zap.ByteString("stack", debug.Stack()),
				)
				c.AbortWithStatusJSON(http.StatusInternalServerError, dto.ErrorResp{
					Error:   "INTERNAL_ERROR",
					Message: "服务器内部错误",
				})
			}
		}()
		c.Next()
	}
}
