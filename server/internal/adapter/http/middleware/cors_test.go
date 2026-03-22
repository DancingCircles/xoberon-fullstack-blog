package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"xoberon-server/internal/adapter/http/middleware"
)

func TestCORS_AllowedOrigin(t *testing.T) {
	r := gin.New()
	r.Use(middleware.CORS([]string{"https://example.com"}))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://example.com")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, "https://example.com", w.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_DisallowedOrigin(t *testing.T) {
	r := gin.New()
	r.Use(middleware.CORS([]string{"https://example.com"}))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://evil.com")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_PreflightOptions(t *testing.T) {
	r := gin.New()
	r.Use(middleware.CORS([]string{"https://example.com"}))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{})
	})
	r.OPTIONS("/test", func(c *gin.Context) {})

	req, _ := http.NewRequest("OPTIONS", "/test", nil)
	req.Header.Set("Origin", "https://example.com")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 204, w.Code)
	assert.Equal(t, "https://example.com", w.Header().Get("Access-Control-Allow-Origin"))
}
