package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"
	goredis "github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	apphttp "xoberon-server/internal/adapter/http"
	"xoberon-server/internal/adapter/http/handler"
	"xoberon-server/internal/adapter/http/middleware"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/domain/service"
	"xoberon-server/internal/infra/auth"
	"xoberon-server/internal/infra/captcha"
	"xoberon-server/internal/infra/config"
	"xoberon-server/internal/infra/moderation"
	"xoberon-server/internal/infra/persistence/noop"
	"xoberon-server/internal/infra/persistence/postgres"
	"xoberon-server/internal/infra/persistence/redis"
	"xoberon-server/internal/infra/recommendation"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
	"xoberon-server/pkg/bloom"
	"xoberon-server/pkg/logger"
)

func main() {
	// ---- 配置（zap 尚未初始化，使用标准 log）----
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// ---- 日志 ----
	zapLog := logger.New(cfg.Log.Level, cfg.Log.Format)
	logger.Init(zapLog)
	defer zapLog.Sync()

	// ---- 基础设施 ----
	db, err := postgres.NewDB(cfg.DB)
	if err != nil {
		logger.L().Fatal("连接 PostgreSQL 失败", zap.Error(err))
	}
	defer db.Close()

	var postCache repository.PostCachePort
	var essayCache repository.EssayCachePort
	var rateLimitFn middleware.RateLimitFunc
	var tokenBlacklist auth.TokenBlacklist
	var loginLimiter auth.LoginLimiter
	var captchaGen captcha.Generator
	var rdbClient *goredis.Client
	var shutdownFuncs []func()

	rdb, err := redis.NewClient(cfg.Redis)
	if err != nil {
		logger.L().Warn("连接 Redis 失败，启用降级模式（无缓存+本地限流+本地黑名单）", zap.Error(err))
		postCache = noop.NewNoopPostCache()
		essayCache = noop.NewNoopEssayCache()
		localRL := noop.NewLocalRateLimiter(20, 1*time.Minute)
		rateLimitFn = localRL.Allow
		localBL := noop.NewLocalTokenBlacklist()
		tokenBlacklist = localBL
		localLL := auth.NewLocalLoginLimiter()
		loginLimiter = localLL
		noopCaptchaStore := captcha.NewNoopStore()
		captchaGen = captcha.NewGenerator(noopCaptchaStore)
		shutdownFuncs = append(shutdownFuncs,
			localRL.Close,
			localBL.Close,
			localLL.Close,
			noopCaptchaStore.Close,
		)
	} else {
		defer rdb.Close()
		rdbClient = rdb
		postCache = redis.NewPostCacheWithTTL(rdb, cfg.Redis.CacheListTTL, cfg.Redis.CacheDetailTTL, cfg.Redis.NullMarkerTTL)
		essayCache = redis.NewEssayCacheWithTTL(rdb, cfg.Redis.CacheListTTL, cfg.Redis.CacheDetailTTL, cfg.Redis.NullMarkerTTL)
		rl := redis.NewRateLimiter(rdb, 20, 1*time.Minute)
		rateLimitFn = rl.Allow
		tokenBlacklist = auth.NewRedisTokenBlacklist(rdb)
		loginLimiter = auth.NewRedisLoginLimiter(rdb)
		captchaGen = captcha.NewGenerator(captcha.NewRedisStore(rdb))
	}

	jwtMgr := auth.NewJWTManager(cfg.JWT)

	// ---- Repository ----
	userRepo := postgres.NewUserRepo(db)
	postRepo := postgres.NewPostRepo(db)
	essayRepo := postgres.NewEssayRepo(db)
	commentRepo := postgres.NewCommentRepo(db)
	contactRepo := postgres.NewContactRepo(db)
	likeRepo := postgres.NewLikeRepo(db)
	viewRepo := postgres.NewViewRepo(db)

	// ---- 布隆过滤器：启动时从 DB 加载全量 slug ----
	slugFilter := bloom.New(100_000, 0.0001)
	initCtx, initCancel := context.WithTimeout(context.Background(), 10*time.Second)
	slugs, err := postRepo.ListAllSlugs(initCtx)
	initCancel()
	if err != nil {
		logger.L().Warn("bloom 初始化加载 slug 失败（降级为空过滤器）", zap.Error(err))
	} else {
		slugFilter.Rebuild(slugs)
		logger.L().Info("bloom 已加载 slug", zap.Int("count", len(slugs)))
	}

	// ---- 内容审核（同步路径：仅 DFA 关键词过滤，<1ms 无网络调用）----
	var moderator service.ContentModerator
	var qwenModerator *moderation.QwenModerator
	if cfg.Moderation.Enabled {
		moderator = moderation.NewKeywordFilter(moderation.DefaultKeywords)
		logger.L().Info("DFA 关键词过滤已启用（同步审核）")
	} else {
		moderator = moderation.NewNoopModerator()
		logger.L().Info("审核已禁用（NoopModerator）")
	}
	if cfg.Moderation.Qwen.APIKey != "" {
		qwenModerator = moderation.NewQwenModerator(cfg.Moderation.Qwen)
		logger.L().Info("通义千问审核器已初始化（供 Worker 使用）")
	}

	// ---- UseCase: Command ----
	registerHandler := command.NewRegisterHandler(userRepo, jwtMgr)
	loginHandler := command.NewLoginHandler(userRepo, jwtMgr, loginLimiter)
	createPostHandler := command.NewCreatePostHandler(postRepo, postCache, slugFilter, moderator)
	updatePostHandler := command.NewUpdatePostHandler(postRepo, postCache, moderator)
	deletePostHandler := command.NewDeletePostHandler(postRepo, postCache, slugFilter)
	createEssayHandler := command.NewCreateEssayHandler(essayRepo, essayCache, moderator)
	updateEssayHandler := command.NewUpdateEssayHandler(essayRepo, essayCache, moderator)
	deleteEssayHandler := command.NewDeleteEssayHandler(essayRepo, essayCache)
	createCommentHandler := command.NewCreateCommentHandler(commentRepo, postRepo, postCache, moderator)
	deleteCommentHandler := command.NewDeleteCommentHandler(commentRepo, postRepo, postCache)
	toggleLikeHandler := command.NewToggleLikeHandler(likeRepo)
	recordViewHandler := command.NewRecordViewHandler(viewRepo, postRepo)
	submitContactHandler := command.NewSubmitContactHandler(contactRepo)
	updateUserRoleHandler := command.NewUpdateUserRoleHandler(userRepo)
	updateProfileHandler := command.NewUpdateProfileHandler(userRepo)
	markContactReadHandler := command.NewMarkContactReadHandler(contactRepo)
	changePasswordHandler := command.NewChangePasswordHandler(userRepo)

	// ---- 推荐系统（本地 HackerNews 风格热度算法，零 API 调用）----
	recommender := recommendation.NewScoreRecommender(postRepo, viewRepo, likeRepo)
	logger.L().Info("本地推荐算法已启用（HackerNews 热度 + 标签偏好 + 浏览去重）")

	// ---- UseCase: Query ----
	listPostsHandler := query.NewListPostsHandler(postRepo, postCache)
	getRecommendationsHandler := query.NewGetRecommendationsHandler(recommender)
	getPostHandler := query.NewGetPostHandler(postRepo, commentRepo, postCache, slugFilter)
	listEssaysHandler := query.NewListEssaysHandler(essayRepo, essayCache)
	getEssayHandler := query.NewGetEssayHandler(essayRepo, essayCache)
	getUserProfileHandler := query.NewGetUserProfileHandler(userRepo, postRepo, essayRepo)
	searchUsersHandler := query.NewSearchUsersHandler(userRepo)
	listUsersHandler := query.NewListUsersHandler(userRepo)
	listContactsHandler := query.NewListContactsHandler(contactRepo)
	listCommentsByPostHandler := query.NewListCommentsByPostHandler(commentRepo)

	// ---- HTTP Handler ----
	handlers := apphttp.Handlers{
		Auth:           handler.NewAuthHandler(registerHandler, loginHandler, tokenBlacklist, captchaGen, zapLog),
		Post:           handler.NewPostHandler(db, listPostsHandler, getPostHandler, createPostHandler, updatePostHandler, deletePostHandler, toggleLikeHandler, postCache),
		Essay:          handler.NewEssayHandler(listEssaysHandler, getEssayHandler, createEssayHandler, updateEssayHandler, deleteEssayHandler, toggleLikeHandler, essayCache),
		Comment:        handler.NewCommentHandler(listCommentsByPostHandler, createCommentHandler, deleteCommentHandler),
		User:           handler.NewUserHandler(getUserProfileHandler, listUsersHandler, searchUsersHandler, updateUserRoleHandler, updateProfileHandler, changePasswordHandler),
		Contact:        handler.NewContactHandler(submitContactHandler, listContactsHandler, markContactReadHandler),
		Recommendation: handler.NewRecommendationHandler(getRecommendationsHandler, recordViewHandler),
		Admin:          handler.NewAdminHandler(db, postCache, essayCache, rdbClient),
		Heartbeat:      handler.NewHeartbeatHandler(rdbClient),
	}

	// ---- Router + Server ----
	router := apphttp.NewRouter(apphttp.RouterDeps{
		Log:            zapLog,
		JWTMgr:         jwtMgr,
		Blacklist:      tokenBlacklist,
		AllowedOrigins: cfg.CORS.AllowedOrigins,
		TrustedProxies: cfg.Server.TrustedProxies,
		RateLimiter:    rateLimitFn,
		HealthCheck: func(ctx context.Context) error {
			if err := db.PingContext(ctx); err != nil {
				return fmt.Errorf("db: %w", err)
			}
			if rdbClient != nil {
				if err := rdbClient.Ping(ctx).Err(); err != nil {
					return fmt.Errorf("redis: %w", err)
				}
			}
			return nil
		},
	}, handlers)

	// ---- 后台内容巡查 Worker（异步路径：通义千问语义审核）----
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()

	if cfg.Moderation.WorkerEnabled && qwenModerator != nil {
		worker := moderation.NewModerationWorker(qwenModerator, db, postCache, essayCache, cfg.Moderation.WorkerInterval)
		go worker.Run(workerCtx)
		logger.L().Info("AI 巡查 Worker 已启动", zap.Duration("interval", cfg.Moderation.WorkerInterval))
	} else if cfg.Moderation.WorkerEnabled {
		logger.L().Warn("Worker 已启用但通义千问 API Key 未配置，跳过启动")
	}

	// Prometheus metrics 监听内部端口，不对外暴露
	metricsAddr := cfg.Server.MetricsAddr + ":" + cfg.Server.MetricsPort
	metricsSrv := &http.Server{Addr: metricsAddr, Handler: nil}
	go func() {
		mux := http.NewServeMux()
		mux.Handle("/metrics", promhttp.Handler())
		metricsSrv.Handler = mux
		logger.L().Info("内部监控端口监听", zap.String("addr", metricsAddr))
		if err := metricsSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.L().Warn("监控服务异常", zap.Error(err))
		}
	}()

	server := apphttp.NewServer(cfg.Server.Port, cfg.Server.Mode, router, zapLog, cfg.Server.ShutdownTimeout)

	if err := server.Run(); err != nil {
		logger.L().Fatal("服务异常退出", zap.Error(err))
	}

	// ---- 优雅关停：清理后台资源 ----
	workerCancel()

	metricsShutdownCtx, metricsCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer metricsCancel()
	if err := metricsSrv.Shutdown(metricsShutdownCtx); err != nil {
		logger.L().Warn("metrics 服务关停失败", zap.Error(err))
	}

	for _, fn := range shutdownFuncs {
		fn()
	}
	logger.L().Info("所有后台资源已清理完毕")
}
