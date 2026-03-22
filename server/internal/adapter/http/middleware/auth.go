package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"xoberon-server/internal/adapter/http/dto"
	"xoberon-server/internal/infra/auth"
)

const (
	ContextKeyUserID   = "user_id"
	ContextKeyUsername = "username"
	ContextKeyRole     = "role"
	ContextKeyJTI      = "jti"
	ContextKeyTokenExp = "token_exp"
)

// Auth JWT 鉴权中间件（含黑名单检查，fail-closed 策略）
func Auth(jwtMgr *auth.JWTManager, blacklist auth.TokenBlacklist, log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResp{
				Error: "UNAUTHORIZED", Message: "缺少 Authorization 请求头",
			})
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResp{
				Error: "UNAUTHORIZED", Message: "Authorization 格式错误，须为 Bearer <token>",
			})
			return
		}

		claims, err := jwtMgr.Validate(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResp{
				Error: "UNAUTHORIZED", Message: "token 无效或已过期",
			})
			return
		}

		if claims.ID != "" {
			revoked, err := blacklist.IsRevoked(c.Request.Context(), claims.ID)
			if err != nil {
				// 黑名单查询失败采用 fail-closed 策略：拒绝请求并记录告警。
				// 这意味着 Redis 故障期间所有已登录用户需重新登录，以换取安全保证。
				log.Warn("token 黑名单查询失败，拒绝请求（fail-closed）",
					zap.Error(err),
					zap.String("jti", claims.ID),
					zap.String("path", c.Request.URL.Path),
				)
				c.AbortWithStatusJSON(http.StatusServiceUnavailable, dto.ErrorResp{
					Error: "SERVICE_UNAVAILABLE", Message: "服务暂时不可用，请稍后重试",
				})
				return
			}
			if revoked {
				c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResp{
					Error: "UNAUTHORIZED", Message: "token 已被撤销",
				})
				return
			}
		}

		c.Set(ContextKeyUserID, claims.UserID)
		c.Set(ContextKeyUsername, claims.Username)
		c.Set(ContextKeyRole, claims.Role)
		c.Set(ContextKeyJTI, claims.ID)
		if claims.ExpiresAt != nil {
			c.Set(ContextKeyTokenExp, claims.ExpiresAt.Time)
		}
		c.Next()
	}
}

// OptionalAuth 可选鉴权：有合法 token 就解析用户信息，没有或无效则跳过（不拦截）。
// 用于匿名/登录用户均可访问的接口（如推荐系统）。
func OptionalAuth(jwtMgr *auth.JWTManager, blacklist auth.TokenBlacklist) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		claims, err := jwtMgr.Validate(parts[1])
		if err != nil {
			c.Next()
			return
		}

		if claims.ID != "" {
			revoked, err := blacklist.IsRevoked(c.Request.Context(), claims.ID)
			if err != nil || revoked {
				c.Next()
				return
			}
		}

		c.Set(ContextKeyUserID, claims.UserID)
		c.Set(ContextKeyUsername, claims.Username)
		c.Set(ContextKeyRole, claims.Role)
		c.Next()
	}
}

// RequireAdmin 管理员权限中间件（须在 Auth 之后），admin 和 owner 均可通过
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get(ContextKeyRole)
		if role != "admin" && role != "owner" {
			c.AbortWithStatusJSON(http.StatusForbidden, dto.ErrorResp{
				Error: "FORBIDDEN", Message: "需要管理员权限",
			})
			return
		}
		c.Next()
	}
}

// GetUserID 从 Context 读取当前用户 ID
func GetUserID(c *gin.Context) uuid.UUID {
	val, exists := c.Get(ContextKeyUserID)
	if !exists {
		return uuid.Nil
	}
	id, ok := val.(uuid.UUID)
	if !ok {
		return uuid.Nil
	}
	return id
}

// GetUserRole 从 Context 读取当前用户角色
func GetUserRole(c *gin.Context) string {
	val, _ := c.Get(ContextKeyRole)
	role, _ := val.(string)
	return role
}
