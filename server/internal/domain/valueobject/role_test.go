package valueobject

import (
	"testing"
)

func TestNewRole_Valid(t *testing.T) {
	cases := map[string]Role{
		"user":  RoleUser,
		"admin": RoleAdmin,
	}
	for raw, expected := range cases {
		r, err := NewRole(raw)
		if err != nil {
			t.Errorf("NewRole(%q) unexpected error: %v", raw, err)
		}
		if r != expected {
			t.Errorf("NewRole(%q) = %v, want %v", raw, r, expected)
		}
	}
}

func TestNewRole_Invalid(t *testing.T) {
	_, err := NewRole("superadmin")
	if err == nil {
		t.Fatal("expected error for invalid role")
	}
}

func TestRole_IsAdmin(t *testing.T) {
	if !RoleAdmin.IsAdmin() {
		t.Error("RoleAdmin.IsAdmin() should be true")
	}
	if RoleUser.IsAdmin() {
		t.Error("RoleUser.IsAdmin() should be false")
	}
}
