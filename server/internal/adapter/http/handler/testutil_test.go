package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"xoberon-server/internal/adapter/http/middleware"
	"xoberon-server/internal/infra/auth"
	"xoberon-server/internal/infra/config"
)

const testJWTSecret = "test-secret-key-must-be-at-least-32-bytes-long!!"

func init() {
	gin.SetMode(gin.TestMode)
}

func setupRouter() *gin.Engine {
	return gin.New()
}

func newTestJWTManager() *auth.JWTManager {
	return auth.NewJWTManager(config.JWTConfig{
		Secret:            testJWTSecret,
		AccessExpiration:  1 * time.Hour,
		RefreshExpiration: 24 * time.Hour,
	})
}

func generateTestToken(jwtMgr *auth.JWTManager, userID uuid.UUID, username, role string) string {
	token, _ := jwtMgr.GenerateAccessToken(userID, username, role)
	return token
}

func performRequest(r *gin.Engine, method, path string, body interface{}) *httptest.ResponseRecorder {
	var req *http.Request
	if body != nil {
		jsonBytes, _ := json.Marshal(body)
		req, _ = http.NewRequest(method, path, bytes.NewBuffer(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, _ = http.NewRequest(method, path, nil)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func performAuthRequest(r *gin.Engine, method, path string, body interface{}, token string) *httptest.ResponseRecorder {
	var req *http.Request
	if body != nil {
		jsonBytes, _ := json.Marshal(body)
		req, _ = http.NewRequest(method, path, bytes.NewBuffer(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, _ = http.NewRequest(method, path, nil)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// setAuthContext 在 gin.Context 中注入认证信息（模拟 Auth 中间件已执行）
func authMiddleware(userID uuid.UUID, username, role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(middleware.ContextKeyUserID, userID)
		c.Set(middleware.ContextKeyUsername, username)
		c.Set(middleware.ContextKeyRole, role)
		c.Set(middleware.ContextKeyJTI, "test-jti-"+uuid.New().String())
		c.Set(middleware.ContextKeyTokenExp, time.Now().Add(1*time.Hour))
		c.Next()
	}
}

func parseJSON(w *httptest.ResponseRecorder, v interface{}) {
	_ = json.Unmarshal(w.Body.Bytes(), v)
}
