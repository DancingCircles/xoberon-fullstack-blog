package errs

import (
	"errors"
	"fmt"
	"testing"
)

func TestAppError_Error(t *testing.T) {
	e := Validation("字段不合法")
	if e.Error() != "字段不合法" {
		t.Errorf("unexpected message: %q", e.Error())
	}
}

func TestAppError_Code(t *testing.T) {
	cases := map[Code]func(string) *AppError{
		CodeValidation:   Validation,
		CodeNotFound:     NotFound,
		CodeForbidden:    Forbidden,
		CodeConflict:     Conflict,
		CodeUnauthorized: Unauthorized,
		CodeInternal:     Internal,
	}
	for code, fn := range cases {
		e := fn("test")
		if e.Code() != code {
			t.Errorf("expected code %v, got %v", code, e.Code())
		}
	}
}

func TestAppError_Wrap(t *testing.T) {
	cause := fmt.Errorf("db connection failed")
	e := Wrap(CodeInternal, "操作失败", cause)
	if e.Code() != CodeInternal {
		t.Errorf("expected INTERNAL, got %v", e.Code())
	}
	if !errors.Is(e, cause) {
		t.Error("Unwrap should return the cause")
	}
	if e.Error() != "操作失败: db connection failed" {
		t.Errorf("unexpected message: %q", e.Error())
	}
}

func TestValidationf(t *testing.T) {
	e := Validationf("长度须在 %d-%d 之间", 3, 50)
	if e.Error() != "长度须在 3-50 之间" {
		t.Errorf("unexpected message: %q", e.Error())
	}
}

func TestIsNotFound(t *testing.T) {
	if !IsNotFound(NotFound("not here")) {
		t.Error("IsNotFound should return true for NOT_FOUND error")
	}
	if IsNotFound(Validation("bad input")) {
		t.Error("IsNotFound should return false for VALIDATION_ERROR")
	}
	if IsNotFound(nil) {
		t.Error("IsNotFound should return false for nil")
	}

	wrapped := fmt.Errorf("context: %w", NotFound("wrapped"))
	if !IsNotFound(wrapped) {
		t.Error("IsNotFound should work with wrapped errors")
	}
}
