package entity

import (
	"strings"
	"testing"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/valueobject"
)

func TestNewEssay_Valid(t *testing.T) {
	essay, err := NewEssay(uuid.New(), "随笔标题", "", "这是一篇测试随笔，内容至少十个字符以上。")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if essay.Title() != "随笔标题" {
		t.Errorf("title mismatch: %q", essay.Title())
	}
	if essay.Excerpt() == "" {
		t.Error("excerpt should be auto-generated when empty")
	}
	if essay.LikeCount() != 0 {
		t.Errorf("initial like count should be 0")
	}
}

func TestNewEssay_EmptyTitle(t *testing.T) {
	_, err := NewEssay(uuid.New(), "", "", "content with at least ten chars")
	if err == nil {
		t.Fatal("expected error for empty title")
	}
}

func TestNewEssay_ShortContent(t *testing.T) {
	_, err := NewEssay(uuid.New(), "Title", "", "短")
	if err == nil {
		t.Fatal("expected error for content < 10 chars")
	}
}

func TestEssay_Edit(t *testing.T) {
	authorID := uuid.New()
	essay, _ := NewEssay(authorID, "Original", "", "这是原始内容，确保超过十个字符。")

	err := essay.Edit(authorID, valueobject.RoleUser, "Updated", "", "更新后的内容，需要超过十个字符才行。")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if essay.Title() != "Updated" {
		t.Errorf("title should be updated: %q", essay.Title())
	}
}

func TestEssay_Edit_Forbidden(t *testing.T) {
	essay, _ := NewEssay(uuid.New(), "Title", "", "这是内容这是内容这是内容。")
	err := essay.Edit(uuid.New(), valueobject.RoleUser, "Hacked", "", "黑客内容黑客内容黑客内容。")
	if err == nil {
		t.Fatal("expected forbidden error")
	}
}

func TestEssay_LikeCount(t *testing.T) {
	essay, _ := NewEssay(uuid.New(), "Title", "", strings.Repeat("内容", 10))
	essay.IncrementLikes()
	essay.IncrementLikes()
	if essay.LikeCount() != 2 {
		t.Errorf("expected 2, got %d", essay.LikeCount())
	}
	essay.DecrementLikes()
	essay.DecrementLikes()
	essay.DecrementLikes()
	if essay.LikeCount() != 0 {
		t.Error("like count should not go below 0")
	}
}
