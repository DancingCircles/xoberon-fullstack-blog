package valueobject

import (
	"strings"
	"testing"
)

func TestNewPassword_Valid(t *testing.T) {
	pw, err := NewPassword("Securepass123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if pw.Hash() == "" {
		t.Fatal("hash should not be empty")
	}
	if pw.Hash() == "Securepass123" {
		t.Fatal("hash should not equal plaintext")
	}
}

func TestNewPassword_TooShort(t *testing.T) {
	_, err := NewPassword("short")
	if err == nil {
		t.Fatal("expected error for short password")
	}
}

func TestNewPassword_TooLong(t *testing.T) {
	long := strings.Repeat("a", 73)
	_, err := NewPassword(long)
	if err == nil {
		t.Fatal("expected error for password exceeding 72 chars")
	}
}

func TestPassword_Verify(t *testing.T) {
	raw := "MySecret1pass"
	pw, _ := NewPassword(raw)

	if !pw.Verify(raw) {
		t.Error("Verify should return true for correct password")
	}
	if pw.Verify("wrong-pass") {
		t.Error("Verify should return false for wrong password")
	}
}

func TestLoadPassword(t *testing.T) {
	pw, _ := NewPassword("Testpass123")
	loaded := LoadPassword(pw.Hash())
	if !loaded.Verify("Testpass123") {
		t.Error("LoadPassword should preserve hash for verification")
	}
}
