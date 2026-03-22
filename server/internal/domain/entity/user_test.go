package entity

import (
	"testing"

	"xoberon-server/internal/domain/valueobject"
)

func TestNewUser_Valid(t *testing.T) {
	user, err := NewUser("testuser", "test@example.com", "Password123", "Test User")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.Username() != "testuser" {
		t.Errorf("username mismatch: %q", user.Username())
	}
	if user.Handle() != "@testuser" {
		t.Errorf("handle mismatch: %q", user.Handle())
	}
	if user.Role() != valueobject.RoleUser {
		t.Errorf("default role should be user, got %v", user.Role())
	}
	if user.PasswordHash() == "Password123" {
		t.Error("password hash should not equal plaintext")
	}
}

func TestNewUser_EmptyUsername(t *testing.T) {
	_, err := NewUser("", "test@example.com", "Password123", "Name")
	if err == nil {
		t.Fatal("expected error for empty username")
	}
}

func TestNewUser_ShortUsername(t *testing.T) {
	_, err := NewUser("ab", "test@example.com", "Password123", "Name")
	if err == nil {
		t.Fatal("expected error for username < 3 chars")
	}
}

func TestNewUser_InvalidEmail(t *testing.T) {
	_, err := NewUser("testuser", "not-email", "Password123", "Name")
	if err == nil {
		t.Fatal("expected error for invalid email")
	}
}

func TestNewUser_ShortPassword(t *testing.T) {
	_, err := NewUser("testuser", "test@example.com", "short", "Name")
	if err == nil {
		t.Fatal("expected error for short password")
	}
}

func TestUser_VerifyPassword(t *testing.T) {
	user, _ := NewUser("testuser", "test@example.com", "Password123", "Name")
	if !user.VerifyPassword("Password123") {
		t.Error("correct password should verify")
	}
	if user.VerifyPassword("wrong") {
		t.Error("wrong password should not verify")
	}
}

func TestUser_UpdateProfile(t *testing.T) {
	user, _ := NewUser("testuser", "test@example.com", "Password123", "Name")

	err := user.UpdateProfile("New Name", "My bio", "avatar.png")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.Name() != "New Name" {
		t.Errorf("name should be updated: %q", user.Name())
	}
	if user.Bio() != "My bio" {
		t.Errorf("bio should be updated: %q", user.Bio())
	}
}

func TestUser_UpdateProfile_EmptyName(t *testing.T) {
	user, _ := NewUser("testuser", "test@example.com", "Password123", "Name")
	err := user.UpdateProfile("", "bio", "")
	if err == nil {
		t.Fatal("expected error for empty name")
	}
}

func TestUser_ChangePassword(t *testing.T) {
	user, _ := NewUser("testuser", "test@example.com", "Password123", "Name")

	err := user.ChangePassword("wrong-old", "Newpass123")
	if err == nil {
		t.Fatal("expected error for wrong old password")
	}

	err = user.ChangePassword("Password123", "Newpass123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !user.VerifyPassword("Newpass123") {
		t.Error("new password should verify after change")
	}
}

func TestUser_PromoteTo(t *testing.T) {
	user, _ := NewUser("testuser", "test@example.com", "Password123", "Name")
	user.PromoteTo(valueobject.RoleAdmin)
	if !user.Role().IsAdmin() {
		t.Error("user should be admin after promotion")
	}
}
