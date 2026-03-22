package http

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"xoberon-server/internal/adapter/http/handler"
	"xoberon-server/internal/adapter/http/middleware"
	"xoberon-server/internal/infra/auth"
)

type Handlers struct {
	Auth           *handler.AuthHandler
	Post           *handler.PostHandler
	Essay          *handler.EssayHandler
	Comment        *handler.CommentHandler
	User           *handler.UserHandler
	Contact        *handler.ContactHandler
	Recommendation *handler.RecommendationHandler
	Admin          *handler.AdminHandler
	Heartbeat      *handler.HeartbeatHandler
}

type RouterDeps struct {
	Log            *zap.Logger
	JWTMgr         *auth.JWTManager
	Blacklist      auth.TokenBlacklist
	AllowedOrigins []string
	TrustedProxies []string
	RateLimiter    middleware.RateLimitFunc
	HealthCheck    func(ctx context.Context) error
}

func NewRouter(deps RouterDeps, h Handlers) *gin.Engine {
	r := gin.New()

	// 显式设置信任的反向代理 IP，防止 ClientIP() 被伪造影响限流和审计。
	// 生产环境应替换为实际的负载均衡器 IP 或 CIDR 段。
	if err := r.SetTrustedProxies(deps.TrustedProxies); err != nil {
		deps.Log.Warn("设置 trusted proxies 失败", zap.Error(err))
	}

	r.Use(
		middleware.Recover(deps.Log),
		middleware.RequestID(),
		middleware.Metrics(),
		middleware.Logger(deps.Log),
		middleware.CORS(deps.AllowedOrigins),
		middleware.SecureHeaders(),
		middleware.BodyLimit(2<<20), // 2 MB
	)

	// 健康检查不走版本前缀，作为基础设施端点
	r.GET("/api/health", func(c *gin.Context) {
		if deps.HealthCheck != nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
			defer cancel()
			if err := deps.HealthCheck(ctx); err != nil {
				deps.Log.Warn("health_check_failed", zap.Error(err))
				c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unhealthy"})
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	v1 := r.Group("/api/v1")
	{
		// ---- 公开接口 ----
		rl := middleware.RateLimit(deps.RateLimiter)
		v1.GET("/auth/captcha", rl, h.Auth.Captcha)
		v1.POST("/auth/register", rl, h.Auth.Register)
		v1.POST("/auth/login", rl, h.Auth.Login)

		v1.GET("/posts", h.Post.List)

		optAuth := middleware.OptionalAuth(deps.JWTMgr, deps.Blacklist)
		v1.GET("/posts/recommendations", optAuth, h.Recommendation.Recommendations)

		v1.GET("/posts/:id", h.Post.GetBySlug)
		v1.GET("/posts/:id/comments", h.Comment.ListByPost)

		v1.GET("/essays", h.Essay.List)
		v1.GET("/essays/:id", h.Essay.GetByID)

		v1.GET("/users/:handle", h.User.GetProfile)

		// ---- 需要登录 ----
		authMW := middleware.Auth(deps.JWTMgr, deps.Blacklist, deps.Log)
		authed := v1.Group("", authMW)
		{
			authed.POST("/auth/logout", h.Auth.Logout)
			authed.POST("/heartbeat", h.Heartbeat.Heartbeat)
			authed.POST("/contact", rl, h.Contact.Submit)

			authed.POST("/posts", rl, h.Post.Create)
			authed.PUT("/posts/:id", rl, h.Post.Update)
			authed.DELETE("/posts/:id", rl, h.Post.Delete)
			authed.POST("/posts/:id/like", rl, h.Post.Like)
			authed.POST("/posts/:id/comments", rl, h.Comment.Create)
			authed.DELETE("/posts/:id/comments/:commentId", rl, h.Comment.Delete)
			authed.POST("/posts/:id/view", h.Recommendation.RecordView)

			authed.POST("/essays", rl, h.Essay.Create)
			authed.PUT("/essays/:id", rl, h.Essay.Update)
			authed.DELETE("/essays/:id", rl, h.Essay.Delete)
			authed.POST("/essays/:id/like", rl, h.Essay.Like)

			authed.GET("/users", h.User.Search)
			authed.PUT("/users/me", rl, h.User.UpdateMe)
			authed.PUT("/users/me/password", rl, h.User.ChangePassword)
		}

		// ---- 管理员 ----
		admin := v1.Group("/admin", authMW, middleware.RequireAdmin())
		{
			admin.GET("/contacts", h.Contact.List)
			admin.PUT("/contacts/:id/read", h.Contact.MarkRead)

			admin.GET("/users", h.User.AdminListUsers)
			admin.PUT("/users/:id/role", h.User.AdminUpdateRole)

			admin.GET("/stats", h.Admin.GetStats)
			admin.GET("/activities", h.Admin.GetActivities)

			admin.GET("/reviews", h.Admin.GetReviews)
			admin.PUT("/reviews/:id/approve", h.Admin.ApproveReview)
			admin.PUT("/reviews/:id/reject", h.Admin.RejectReview)

			admin.DELETE("/comments/:id", h.Admin.DeleteComment)

			admin.GET("/online-count", h.Heartbeat.OnlineCount)
		}
	}

	return r
}
