package errs

import (
	"errors"
	"fmt"
)

type Code string

const (
	CodeValidation   Code = "VALIDATION_ERROR"
	CodeNotFound     Code = "NOT_FOUND"
	CodeForbidden    Code = "FORBIDDEN"
	CodeConflict     Code = "CONFLICT"
	CodeUnauthorized Code = "UNAUTHORIZED"
	CodeInternal     Code = "INTERNAL_ERROR"
)

// AppError 业务错误，贯穿 domain → usecase → handler 全链路
type AppError struct {
	code    Code
	message string
	cause   error
}

func (e *AppError) Error() string {
	if e.cause != nil {
		return fmt.Sprintf("%s: %s", e.message, e.cause.Error())
	}
	return e.message
}

func (e *AppError) Code() Code    { return e.code }
func (e *AppError) Message() string { return e.message }
func (e *AppError) Unwrap() error  { return e.cause }

func newErr(code Code, msg string) *AppError {
	return &AppError{code: code, message: msg}
}

func Wrap(code Code, msg string, cause error) *AppError {
	return &AppError{code: code, message: msg, cause: cause}
}

// ---- 便捷构造函数 ----

func Validation(msg string) *AppError   { return newErr(CodeValidation, msg) }
func NotFound(msg string) *AppError     { return newErr(CodeNotFound, msg) }
func Forbidden(msg string) *AppError    { return newErr(CodeForbidden, msg) }
func Conflict(msg string) *AppError     { return newErr(CodeConflict, msg) }
func Unauthorized(msg string) *AppError { return newErr(CodeUnauthorized, msg) }
func Internal(msg string) *AppError     { return newErr(CodeInternal, msg) }

func Validationf(format string, args ...any) *AppError {
	return newErr(CodeValidation, fmt.Sprintf(format, args...))
}

// IsNotFound 判断 err 是否为 NOT_FOUND 类型的 AppError
func IsNotFound(err error) bool {
	var ae *AppError
	if errors.As(err, &ae) {
		return ae.code == CodeNotFound
	}
	return false
}
