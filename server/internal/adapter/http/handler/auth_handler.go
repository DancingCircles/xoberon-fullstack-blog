package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"xoberon-server/internal/adapter/http/dto"
	"xoberon-server/internal/adapter/http/middleware"
	"xoberon-server/internal/infra/auth"
	"xoberon-server/internal/infra/captcha"
	"xoberon-server/internal/usecase/command"
)

type AuthHandler struct {
	register  *command.RegisterHandler
	login     *command.LoginHandler
	blacklist auth.TokenBlacklist
	captcha   captcha.Generator
	log       *zap.Logger
}

func NewAuthHandler(register *command.RegisterHandler, login *command.LoginHandler, blacklist auth.TokenBlacklist, captchaGen captcha.Generator, log *zap.Logger) *AuthHandler {
	return &AuthHandler{register: register, login: login, blacklist: blacklist, captcha: captchaGen, log: log}
}

func (h *AuthHandler) Captcha(c *gin.Context) {
	id, img, err := h.captcha.Generate()
	if err != nil {
		h.log.Error("captcha_generate_failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "CAPTCHA_ERROR", Message: "生成验证码失败"})
		return
	}
	c.JSON(http.StatusOK, dto.CaptchaResp{CaptchaID: id, Image: img})
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: translateBindingError(err)})
		return
	}

	if !h.captcha.Verify(req.CaptchaID, req.CaptchaCode) {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "CAPTCHA_ERROR", Message: "验证码错误或已过期"})
		return
	}

	result, err := h.register.Handle(c.Request.Context(), command.RegisterCommand{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
		Name:     req.Name,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.LoginResp{
		Token: result.Token,
		User:  dto.ToUserResp(result.User),
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: translateBindingError(err)})
		return
	}

	result, err := h.login.Handle(c.Request.Context(), command.LoginCommand{
		Username: req.Username,
		Password: req.Password,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.LoginResp{
		Token: result.Token,
		User:  dto.ToUserResp(result.User),
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	jti, _ := c.Get(middleware.ContextKeyJTI)
	jtiStr, _ := jti.(string)
	if jtiStr == "" {
		c.JSON(http.StatusOK, dto.MessageResp{Message: "已登出"})
		return
	}

	expVal, _ := c.Get(middleware.ContextKeyTokenExp)
	ttl := 24 * time.Hour
	if exp, ok := expVal.(time.Time); ok {
		remaining := time.Until(exp)
		if remaining > 0 {
			ttl = remaining
		}
	}

	if err := h.blacklist.Revoke(c.Request.Context(), jtiStr, ttl); err != nil {
		h.log.Warn("logout_revoke_failed", zap.Error(err), zap.String("jti", jtiStr))
	}
	c.JSON(http.StatusOK, dto.MessageResp{Message: "已登出"})
}
