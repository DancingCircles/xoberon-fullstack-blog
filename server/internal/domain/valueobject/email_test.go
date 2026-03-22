package valueobject

import (
	"testing"
)

func TestNewEmail_Valid(t *testing.T) {
	cases := []string{
		"user@example.com",
		"USER@EXAMPLE.COM",
		"test.email+tag@domain.co",
	}
	for _, raw := range cases {
		e, err := NewEmail(raw)
		if err != nil {
			t.Errorf("NewEmail(%q) unexpected error: %v", raw, err)
		}
		if e.IsZero() {
			t.Errorf("NewEmail(%q) returned zero Email", raw)
		}
	}
}

func TestNewEmail_Invalid(t *testing.T) {
	cases := []string{
		"",
		"   ",
		"not-an-email",
		"missing@",
		"@no-local.com",
		"spaces in@email.com",
	}
	for _, raw := range cases {
		_, err := NewEmail(raw)
		if err == nil {
			t.Errorf("NewEmail(%q) expected error, got nil", raw)
		}
	}
}

func TestNewEmail_Lowercase(t *testing.T) {
	e, _ := NewEmail("USER@EXAMPLE.COM")
	if e.String() != "user@example.com" {
		t.Errorf("expected lowercase, got %q", e.String())
	}
}

func TestLoadEmail(t *testing.T) {
	e := LoadEmail("raw@test.com")
	if e.String() != "raw@test.com" {
		t.Errorf("LoadEmail mismatch: %q", e.String())
	}
}
