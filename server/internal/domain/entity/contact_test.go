package entity

import (
	"strings"
	"testing"
)

func TestNewContact_Valid(t *testing.T) {
	c, err := NewContact("Zhang San", "zhang@example.com", "Hello, I want to collaborate.")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c.Name() != "Zhang San" {
		t.Errorf("name mismatch: %q", c.Name())
	}
	if c.IsRead() {
		t.Error("new contact should not be read")
	}
}

func TestNewContact_EmptyName(t *testing.T) {
	_, err := NewContact("", "test@example.com", "message")
	if err == nil {
		t.Fatal("expected error for empty name")
	}
}

func TestNewContact_InvalidEmail(t *testing.T) {
	_, err := NewContact("Name", "bad-email", "message")
	if err == nil {
		t.Fatal("expected error for invalid email")
	}
}

func TestNewContact_EmptyMessage(t *testing.T) {
	_, err := NewContact("Name", "test@example.com", "")
	if err == nil {
		t.Fatal("expected error for empty message")
	}
}

func TestNewContact_TooLongMessage(t *testing.T) {
	long := strings.Repeat("a", 5001)
	_, err := NewContact("Name", "test@example.com", long)
	if err == nil {
		t.Fatal("expected error for message > 5000 chars")
	}
}

func TestContact_MarkRead(t *testing.T) {
	c, _ := NewContact("Name", "test@example.com", "Hello")
	c.MarkRead()
	if !c.IsRead() {
		t.Error("contact should be marked as read")
	}
}
