package entity

import (
	"testing"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/valueobject"
)

func TestNewComment_Valid(t *testing.T) {
	c, err := NewComment(uuid.New(), uuid.New(), "This is a comment")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c.Content() != "This is a comment" {
		t.Errorf("content mismatch: %q", c.Content())
	}
}

func TestNewComment_Empty(t *testing.T) {
	_, err := NewComment(uuid.New(), uuid.New(), "")
	if err == nil {
		t.Fatal("expected error for empty content")
	}
}

func TestNewComment_TooLong(t *testing.T) {
	long := make([]byte, 2001)
	for i := range long {
		long[i] = 'a'
	}
	_, err := NewComment(uuid.New(), uuid.New(), string(long))
	if err == nil {
		t.Fatal("expected error for content > 2000 chars")
	}
}

func TestComment_CanDelete(t *testing.T) {
	authorID := uuid.New()
	c, _ := NewComment(uuid.New(), authorID, "test content")

	if !c.CanDelete(authorID, valueobject.RoleUser) {
		t.Error("author should be able to delete")
	}
	if !c.CanDelete(uuid.New(), valueobject.RoleAdmin) {
		t.Error("admin should be able to delete")
	}
	if c.CanDelete(uuid.New(), valueobject.RoleUser) {
		t.Error("random user should not be able to delete")
	}
}
