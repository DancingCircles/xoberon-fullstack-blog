package http

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Server struct {
	httpServer      *http.Server
	log             *zap.Logger
	shutdownTimeout time.Duration
}

func NewServer(port string, ginMode string, router *gin.Engine, log *zap.Logger, shutdownTimeout time.Duration) *Server {
	gin.SetMode(ginMode)

	if shutdownTimeout <= 0 {
		shutdownTimeout = 10 * time.Second
	}

	return &Server{
		shutdownTimeout: shutdownTimeout,
		httpServer: &http.Server{
			Addr:              fmt.Sprintf(":%s", port),
			Handler:           router,
			ReadHeaderTimeout: 5 * time.Second,
			ReadTimeout:       15 * time.Second,
			WriteTimeout:      15 * time.Second,
			IdleTimeout:       60 * time.Second,
			MaxHeaderBytes:    1 << 20, // 1 MB
		},
		log: log,
	}
}

// Run 启动 HTTP 服务并监听系统信号实现优雅关停
func (s *Server) Run() error {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	errCh := make(chan error, 1)
	go func() {
		s.log.Info("服务启动", zap.String("addr", s.httpServer.Addr))
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return fmt.Errorf("服务启动失败: %w", err)
	case sig := <-quit:
		s.log.Info("收到关停信号", zap.String("signal", sig.String()))
	}

	ctx, cancel := context.WithTimeout(context.Background(), s.shutdownTimeout)
	defer cancel()

	if err := s.httpServer.Shutdown(ctx); err != nil {
		return fmt.Errorf("优雅关停失败: %w", err)
	}

	s.log.Info("服务已安全关停")
	return nil
}
