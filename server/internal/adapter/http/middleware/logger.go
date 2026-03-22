package middleware

import (
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

var sensitiveParams = map[string]struct{}{
	"password": {}, "passwd": {}, "secret": {},
	"token": {}, "access_token": {}, "refresh_token": {},
	"api_key": {}, "apikey": {}, "key": {},
	"authorization": {},
}

// sanitizeQuery 对 URL query 中的敏感参数值做脱敏，防止密码/令牌等写入日志
func sanitizeQuery(raw string) string {
	if raw == "" {
		return ""
	}
	params, err := url.ParseQuery(raw)
	if err != nil {
		return "[PARSE_ERROR]"
	}
	for k := range params {
		if _, ok := sensitiveParams[strings.ToLower(k)]; ok {
			params.Set(k, "[REDACTED]")
		}
	}
	return params.Encode()
}

// Logger 结构化请求日志
func Logger(log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := sanitizeQuery(c.Request.URL.RawQuery)

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		fields := []zap.Field{
			zap.Int("status", status),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.String("query", query),
			zap.String("ip", c.ClientIP()),
			zap.Duration("latency", latency),
			zap.String("request_id", c.GetString("request_id")),
		}

		if status >= 500 {
			log.Error("SERVER_ERROR", fields...)
		} else if status >= 400 {
			log.Warn("CLIENT_ERROR", fields...)
		} else {
			log.Info("REQUEST", fields...)
		}
	}
}
