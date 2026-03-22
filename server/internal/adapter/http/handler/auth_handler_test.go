package handler_test

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"xoberon-server/internal/adapter/http/handler"
	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/infra/auth"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func newAuthTestDeps() (
	*mocks.MockUserRepository,
	*mocks.MockLoginLimiter,
	*mocks.MockTokenBlacklist,
	*mocks.MockCaptchaGenerator,
	*auth.JWTManager,
	*handler.AuthHandler,
) {
	userRepo := new(mocks.MockUserRepository)
	limiter := new(mocks.MockLoginLimiter)
	blacklist := new(mocks.MockTokenBlacklist)
	captchaGen := new(mocks.MockCaptchaGenerator)
	jwtMgr := newTestJWTManager()

	registerH := command.NewRegisterHandler(userRepo, jwtMgr)
	loginH := command.NewLoginHandler(userRepo, jwtMgr, limiter)
	authHandler := handler.NewAuthHandler(registerH, loginH, blacklist, captchaGen, zap.NewNop())

	return userRepo, limiter, blacklist, captchaGen, jwtMgr, authHandler
}

func TestRegister_Success(t *testing.T) {
	userRepo, _, _, captchaGen, _, h := newAuthTestDeps()
	userRepo.On("Save", mock.Anything, mock.Anything).Return(nil)
	captchaGen.On("Verify", "test-captcha-id", "abcd").Return(true)

	r := setupRouter()
	r.POST("/api/v1/auth/register", h.Register)

	w := performRequest(r, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username":     "testuser",
		"email":        "test@example.com",
		"password":     "StrongPass123!",
		"name":         "X",
		"captcha_id":   "test-captcha-id",
		"captcha_code": "abcd",
	})

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.NotEmpty(t, resp["token"])
	assert.NotNil(t, resp["user"])
}

func TestRegister_UsernameConflict(t *testing.T) {
	userRepo, _, _, captchaGen, _, h := newAuthTestDeps()
	userRepo.On("Save", mock.Anything, mock.Anything).Return(errs.Conflict("用户名已存在"))
	captchaGen.On("Verify", "test-captcha-id", "abcd").Return(true)

	r := setupRouter()
	r.POST("/api/v1/auth/register", h.Register)

	w := performRequest(r, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username":     "existing",
		"email":        "new@example.com",
		"password":     "StrongPass123!",
		"name":         "X",
		"captcha_id":   "test-captcha-id",
		"captcha_code": "abcd",
	})

	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestRegister_InvalidEmail(t *testing.T) {
	_, _, _, _, _, h := newAuthTestDeps()

	r := setupRouter()
	r.POST("/api/v1/auth/register", h.Register)

	w := performRequest(r, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username":     "testuser",
		"email":        "not-an-email",
		"password":     "StrongPass123!",
		"name":         "X",
		"captcha_id":   "test-captcha-id",
		"captcha_code": "abcd",
	})

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRegister_WeakPassword(t *testing.T) {
	_, _, _, _, _, h := newAuthTestDeps()

	r := setupRouter()
	r.POST("/api/v1/auth/register", h.Register)

	w := performRequest(r, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username":     "testuser",
		"email":        "test@example.com",
		"password":     "123",
		"name":         "X",
		"captcha_id":   "test-captcha-id",
		"captcha_code": "abcd",
	})

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRegister_MissingFields(t *testing.T) {
	_, _, _, _, _, h := newAuthTestDeps()

	r := setupRouter()
	r.POST("/api/v1/auth/register", h.Register)

	w := performRequest(r, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username": "testuser",
	})

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRegister_InvalidCaptcha(t *testing.T) {
	_, _, _, captchaGen, _, h := newAuthTestDeps()
	captchaGen.On("Verify", "bad-id", "wrong").Return(false)

	r := setupRouter()
	r.POST("/api/v1/auth/register", h.Register)

	w := performRequest(r, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username":     "testuser",
		"email":        "test@example.com",
		"password":     "StrongPass123!",
		"name":         "X",
		"captcha_id":   "bad-id",
		"captcha_code": "wrong",
	})

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "CAPTCHA_ERROR", resp["error"])
}

func TestLogin_Success(t *testing.T) {
	userRepo, limiter, _, _, _, h := newAuthTestDeps()

	user, _ := entity.NewUser("loginuser", "login@example.com", "StrongPass123!", "X")
	userRepo.On("FindByUsername", mock.Anything, "loginuser").Return(user, nil)
	limiter.On("Check", mock.Anything, "loginuser").Return(false, nil)
	limiter.On("Reset", mock.Anything, "loginuser").Return(nil)

	r := setupRouter()
	r.POST("/api/v1/auth/login", h.Login)

	w := performRequest(r, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"username": "loginuser",
		"password": "StrongPass123!",
	})

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.NotEmpty(t, resp["token"])
}

func TestLogin_WrongPassword(t *testing.T) {
	userRepo, limiter, _, _, _, h := newAuthTestDeps()

	user, _ := entity.NewUser("loginuser", "login@example.com", "StrongPass123!", "X")
	userRepo.On("FindByUsername", mock.Anything, "loginuser").Return(user, nil)
	limiter.On("Check", mock.Anything, "loginuser").Return(false, nil)
	limiter.On("RecordFailure", mock.Anything, "loginuser").Return(nil)

	r := setupRouter()
	r.POST("/api/v1/auth/login", h.Login)

	w := performRequest(r, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"username": "loginuser",
		"password": "WrongPassword!",
	})

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestLogin_UserNotFound(t *testing.T) {
	userRepo, limiter, _, _, _, h := newAuthTestDeps()

	userRepo.On("FindByUsername", mock.Anything, "ghost").Return(nil, errs.NotFound("用户不存在"))
	limiter.On("Check", mock.Anything, "ghost").Return(false, nil)
	limiter.On("RecordFailure", mock.Anything, "ghost").Return(nil)

	r := setupRouter()
	r.POST("/api/v1/auth/login", h.Login)

	w := performRequest(r, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"username": "ghost",
		"password": "SomePass123!",
	})

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestLogin_MissingFields(t *testing.T) {
	_, _, _, _, _, h := newAuthTestDeps()

	r := setupRouter()
	r.POST("/api/v1/auth/login", h.Login)

	w := performRequest(r, http.MethodPost, "/api/v1/auth/login", map[string]string{})

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestLogout_Success(t *testing.T) {
	_, _, blacklist, _, jwtMgr, h := newAuthTestDeps()
	blacklist.On("Revoke", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	userID := uuid.New()
	token := generateTestToken(jwtMgr, userID, "testuser", "user")

	r := setupRouter()
	r.POST("/api/v1/auth/logout", authMiddleware(userID, "testuser", "user"), h.Logout)

	w := performAuthRequest(r, http.MethodPost, "/api/v1/auth/logout", nil, token)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "已登出", resp["message"])
}

func TestLogout_NoJTI(t *testing.T) {
	_, _, _, _, _, authH := newAuthTestDeps()

	r := setupRouter()
	r.POST("/api/v1/auth/logout", func(c *gin.Context) {
		c.Next()
	}, authH.Logout)

	w := performRequest(r, http.MethodPost, "/api/v1/auth/logout", nil)

	assert.Equal(t, http.StatusOK, w.Code)
}
