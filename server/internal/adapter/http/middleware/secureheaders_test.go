package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"xoberon-server/internal/adapter/http/middleware"
)

func TestSecureHeaders_HSTS(t *testing.T) {
	r := gin.New()
	r.Use(middleware.SecureHeaders())
	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, "max-age=63072000; includeSubDomains", w.Header().Get("Strict-Transport-Security"))
}

func TestSecureHeaders_CSP(t *testing.T) {
	r := gin.New()
	r.Use(middleware.SecureHeaders())
	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, "default-src 'none'; frame-ancestors 'none'", w.Header().Get("Content-Security-Policy"))
}

func TestSecureHeaders_XFrameOptions(t *testing.T) {
	r := gin.New()
	r.Use(middleware.SecureHeaders())
	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, "DENY", w.Header().Get("X-Frame-Options"))
}

func TestSecureHeaders_XContentTypeOptions(t *testing.T) {
	r := gin.New()
	r.Use(middleware.SecureHeaders())
	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, "nosniff", w.Header().Get("X-Content-Type-Options"))
}
