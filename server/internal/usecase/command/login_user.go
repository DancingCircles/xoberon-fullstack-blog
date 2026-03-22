package command

import (
	"context"

	"golang.org/x/crypto/bcrypt"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/infra/auth"
)

// dummyHash 用于用户不存在时执行等时 bcrypt 比较，消除时序差异
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-timing-placeholder"), 12)

type LoginCommand struct {
	Username string
	Password string
}

type LoginResult struct {
	Token string
	User  *entity.User
}

type LoginHandler struct {
	users   repository.UserRepository
	jwt     *auth.JWTManager
	limiter auth.LoginLimiter
}

func NewLoginHandler(users repository.UserRepository, jwt *auth.JWTManager, limiter auth.LoginLimiter) *LoginHandler {
	return &LoginHandler{users: users, jwt: jwt, limiter: limiter}
}

func (h *LoginHandler) Handle(ctx context.Context, cmd LoginCommand) (*LoginResult, error) {
	if locked, _ := h.limiter.Check(ctx, cmd.Username); locked {
		return nil, errs.Unauthorized("登录失败次数过多，请 15 分钟后重试")
	}

	user, err := h.users.FindByUsername(ctx, cmd.Username)
	if err != nil {
		if errs.IsNotFound(err) {
			_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(cmd.Password))
			_ = h.limiter.RecordFailure(ctx, cmd.Username)
			return nil, errs.Unauthorized("用户名或密码错误")
		}
		return nil, err
	}

	if !user.VerifyPassword(cmd.Password) {
		_ = h.limiter.RecordFailure(ctx, cmd.Username)
		return nil, errs.Unauthorized("用户名或密码错误")
	}

	_ = h.limiter.Reset(ctx, cmd.Username)

	token, err := h.jwt.GenerateAccessToken(user.ID(), user.Username(), user.Role().String())
	if err != nil {
		return nil, err
	}

	return &LoginResult{Token: token, User: user}, nil
}
