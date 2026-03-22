package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"xoberon-server/internal/adapter/http/middleware"
	"xoberon-server/internal/infra/auth"
	"xoberon-server/internal/infra/config"
	"xoberon-server/internal/mocks"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func newTestJWT() *auth.JWTManager {
	return auth.NewJWTManager(config.JWTConfig{
		Secret:            "test-secret-key-must-be-at-least-32-bytes-long!!",
		AccessExpiration:  1 * time.Hour,
		RefreshExpiration: 24 * time.Hour,
	})
}

func TestAuth_ValidToken(t *testing.T) {
	jwtMgr := newTestJWT()
	bl := new(mocks.MockTokenBlacklist)
	bl.On("IsRevoked", mock.Anything, mock.Anything).Return(false, nil)

	r := gin.New()
	r.GET("/test", middleware.Auth(jwtMgr, bl, zap.NewNop()), func(c *gin.Context) {
		uid := middleware.GetUserID(c)
		c.JSON(200, gin.H{"user_id": uid.String()})
	})

	userID := uuid.New()
	token, _ := jwtMgr.GenerateAccessToken(userID, "testuser", "user")

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestAuth_NoToken(t *testing.T) {
	jwtMgr := newTestJWT()
	bl := new(mocks.MockTokenBlacklist)

	r := gin.New()
	r.GET("/test", middleware.Auth(jwtMgr, bl, zap.NewNop()), func(c *gin.Context) {
		c.JSON(200, gin.H{})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 401, w.Code)
}

func TestAuth_InvalidToken(t *testing.T) {
	jwtMgr := newTestJWT()
	bl := new(mocks.MockTokenBlacklist)

	r := gin.New()
	r.GET("/test", middleware.Auth(jwtMgr, bl, zap.NewNop()), func(c *gin.Context) {
		c.JSON(200, gin.H{})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 401, w.Code)
}

func TestAuth_RevokedToken(t *testing.T) {
	jwtMgr := newTestJWT()
	bl := new(mocks.MockTokenBlacklist)
	bl.On("IsRevoked", mock.Anything, mock.Anything).Return(true, nil)

	r := gin.New()
	r.GET("/test", middleware.Auth(jwtMgr, bl, zap.NewNop()), func(c *gin.Context) {
		c.JSON(200, gin.H{})
	})

	userID := uuid.New()
	token, _ := jwtMgr.GenerateAccessToken(userID, "testuser", "user")

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 401, w.Code)
}

func TestAuth_BlacklistError(t *testing.T) {
	jwtMgr := newTestJWT()
	bl := new(mocks.MockTokenBlacklist)
	bl.On("IsRevoked", mock.Anything, mock.Anything).Return(false, assert.AnError)

	r := gin.New()
	r.GET("/test", middleware.Auth(jwtMgr, bl, zap.NewNop()), func(c *gin.Context) {
		c.JSON(200, gin.H{})
	})

	userID := uuid.New()
	token, _ := jwtMgr.GenerateAccessToken(userID, "testuser", "user")

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 503, w.Code)
}

func TestOptionalAuth_WithToken(t *testing.T) {
	jwtMgr := newTestJWT()
	bl := new(mocks.MockTokenBlacklist)
	bl.On("IsRevoked", mock.Anything, mock.Anything).Return(false, nil)

	r := gin.New()
	r.GET("/test", middleware.OptionalAuth(jwtMgr, bl), func(c *gin.Context) {
		uid := middleware.GetUserID(c)
		c.JSON(200, gin.H{"user_id": uid.String()})
	})

	userID := uuid.New()
	token, _ := jwtMgr.GenerateAccessToken(userID, "testuser", "user")

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestOptionalAuth_NoToken(t *testing.T) {
	jwtMgr := newTestJWT()
	bl := new(mocks.MockTokenBlacklist)

	r := gin.New()
	r.GET("/test", middleware.OptionalAuth(jwtMgr, bl), func(c *gin.Context) {
		uid := middleware.GetUserID(c)
		c.JSON(200, gin.H{"user_id": uid.String()})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestRequireAdmin_AdminUser(t *testing.T) {
	r := gin.New()
	r.GET("/test",
		func(c *gin.Context) {
			c.Set(middleware.ContextKeyRole, "admin")
			c.Next()
		},
		middleware.RequireAdmin(),
		func(c *gin.Context) {
			c.JSON(200, gin.H{"ok": true})
		},
	)

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestRequireAdmin_NormalUser(t *testing.T) {
	r := gin.New()
	r.GET("/test",
		func(c *gin.Context) {
			c.Set(middleware.ContextKeyRole, "user")
			c.Next()
		},
		middleware.RequireAdmin(),
		func(c *gin.Context) {
			c.JSON(200, gin.H{"ok": true})
		},
	)

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 403, w.Code)
}
