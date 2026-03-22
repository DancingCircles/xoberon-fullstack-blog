package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"xoberon-server/internal/adapter/http/middleware"
)

func TestRateLimit_Allowed(t *testing.T) {
	fn := func(ctx context.Context, key string) (bool, error) {
		return true, nil
	}

	r := gin.New()
	r.GET("/test", middleware.RateLimit(fn), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestRateLimit_Exceeded(t *testing.T) {
	fn := func(ctx context.Context, key string) (bool, error) {
		return false, nil
	}

	r := gin.New()
	r.GET("/test", middleware.RateLimit(fn), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 429, w.Code)
}

func TestRateLimit_NilFunc(t *testing.T) {
	r := gin.New()
	r.GET("/test", middleware.RateLimit(nil), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestRateLimit_Error(t *testing.T) {
	fn := func(ctx context.Context, key string) (bool, error) {
		return false, assert.AnError
	}

	r := gin.New()
	r.GET("/test", middleware.RateLimit(fn), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}
