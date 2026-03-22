package command_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func isUnauthorized(err error) bool {
	var ae *errs.AppError
	return errors.As(err, &ae) && ae.Code() == errs.CodeUnauthorized
}

func TestLoginUser_Success(t *testing.T) {
	userRepo := new(mocks.MockUserRepository)
	limiter := new(mocks.MockLoginLimiter)

	user, _ := entity.NewUser("loginuser", "login@example.com", "StrongPass1", "X")
	userRepo.On("FindByUsername", mock.Anything, "loginuser").Return(user, nil)
	limiter.On("Check", mock.Anything, "loginuser").Return(false, nil)
	limiter.On("Reset", mock.Anything, "loginuser").Return(nil)

	h := command.NewLoginHandler(userRepo, newTestJWT(), limiter)
	result, err := h.Handle(context.Background(), command.LoginCommand{
		Username: "loginuser",
		Password: "StrongPass1",
	})

	assert.NoError(t, err)
	assert.NotEmpty(t, result.Token)
	assert.NotNil(t, result.User)
}

func TestLoginUser_WrongPassword(t *testing.T) {
	userRepo := new(mocks.MockUserRepository)
	limiter := new(mocks.MockLoginLimiter)

	user, _ := entity.NewUser("loginuser", "login@example.com", "StrongPass1", "X")
	userRepo.On("FindByUsername", mock.Anything, "loginuser").Return(user, nil)
	limiter.On("Check", mock.Anything, "loginuser").Return(false, nil)
	limiter.On("RecordFailure", mock.Anything, "loginuser").Return(nil)

	h := command.NewLoginHandler(userRepo, newTestJWT(), limiter)
	_, err := h.Handle(context.Background(), command.LoginCommand{
		Username: "loginuser",
		Password: "WrongPass1",
	})

	assert.Error(t, err)
	assert.True(t, isUnauthorized(err))
}

func TestLoginUser_UserNotFound(t *testing.T) {
	userRepo := new(mocks.MockUserRepository)
	limiter := new(mocks.MockLoginLimiter)

	userRepo.On("FindByUsername", mock.Anything, "ghost").Return(nil, errs.NotFound("用户不存在"))
	limiter.On("Check", mock.Anything, "ghost").Return(false, nil)
	limiter.On("RecordFailure", mock.Anything, "ghost").Return(nil)

	h := command.NewLoginHandler(userRepo, newTestJWT(), limiter)
	_, err := h.Handle(context.Background(), command.LoginCommand{
		Username: "ghost",
		Password: "SomePass1",
	})

	assert.Error(t, err)
	assert.True(t, isUnauthorized(err))
}

func TestLoginUser_AccountLocked(t *testing.T) {
	userRepo := new(mocks.MockUserRepository)
	limiter := new(mocks.MockLoginLimiter)

	limiter.On("Check", mock.Anything, "locked").Return(true, nil)

	h := command.NewLoginHandler(userRepo, newTestJWT(), limiter)
	_, err := h.Handle(context.Background(), command.LoginCommand{
		Username: "locked",
		Password: "SomePass1",
	})

	assert.Error(t, err)
	assert.True(t, isUnauthorized(err))
}
