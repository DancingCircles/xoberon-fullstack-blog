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
	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
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

func TestAuth_UsesCurrentDatabaseRole(t *testing.T) {
	jwtMgr := newTestJWT()
	bl := new(mocks.MockTokenBlacklist)
	users := new(mocks.MockUserRepository)
	bl.On("IsRevoked", mock.Anything, mock.Anything).Return(false, nil)

	userID := uuid.New()
	now := time.Now()
	user := entity.ReconstructUser(userID, "testuser", "test@example.com", "hash", "Test", "@test", "", "", "user", now, now)
	users.On("FindByID", mock.Anything, userID).Return(user, nil)
	token, _ := jwtMgr.GenerateAccessToken(userID, "testuser", "admin")

	r := gin.New()
	r.GET("/test", middleware.Auth(jwtMgr, bl, zap.NewNop(), users), middleware.RequireAdmin(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	req, _ := http.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestAuth_DeletedUserFailsClosed(t *testing.T) {
	jwtMgr := newTestJWT()
	bl := new(mocks.MockTokenBlacklist)
	users := new(mocks.MockUserRepository)
	bl.On("IsRevoked", mock.Anything, mock.Anything).Return(false, nil)

	userID := uuid.New()
	users.On("FindByID", mock.Anything, userID).Return(nil, errs.NotFound("用户不存在"))
	token, _ := jwtMgr.GenerateAccessToken(userID, "deleted", "admin")

	r := gin.New()
	r.GET("/test", middleware.Auth(jwtMgr, bl, zap.NewNop(), users), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	req, _ := http.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
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
