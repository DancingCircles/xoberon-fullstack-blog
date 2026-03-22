package entity

import (
	"testing"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/valueobject"
)

func TestPost_Edit_PreservesSlug(t *testing.T) {
	authorID := uuid.New()
	post, err := NewPost(authorID, "Original Title", longContent(20), "Tech", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	originalSlug := post.Slug()

	err = post.Edit(authorID, valueobject.RoleUser, "New Title", longContent(25), "Design", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if post.Slug() != originalSlug {
		t.Errorf("slug should be preserved after edit, was %q now %q", originalSlug, post.Slug())
	}
	if post.Title() != "New Title" {
		t.Errorf("title should be updated, got %q", post.Title())
	}
}

func TestNewPost_InvalidCategory(t *testing.T) {
	_, err := NewPost(uuid.New(), "Test Post", longContent(20), "Photography", nil)
	if err == nil {
		t.Fatal("expected validation error for invalid category")
	}
}

func TestNewPost_ValidCategories(t *testing.T) {
	for _, cat := range []string{"Design", "Tech", "Culture"} {
		_, err := NewPost(uuid.New(), "Test Post", longContent(20), cat, nil)
		if err != nil {
			t.Errorf("category %q should be valid, got error: %v", cat, err)
		}
	}
}

func TestPost_Edit_InvalidCategory(t *testing.T) {
	authorID := uuid.New()
	post, _ := NewPost(authorID, "Test Post", longContent(20), "Tech", nil)

	err := post.Edit(authorID, valueobject.RoleUser, "Updated", longContent(20), "InvalidCat", nil)
	if err == nil {
		t.Fatal("expected validation error for invalid category in edit")
	}
}
