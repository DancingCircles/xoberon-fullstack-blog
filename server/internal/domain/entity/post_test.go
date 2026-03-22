package entity

import (
	"strings"
	"testing"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/valueobject"
)

func longContent(n int) string {
	return strings.Repeat("测试内容", n)
}

func TestNewPost_Valid(t *testing.T) {
	authorID := uuid.New()
	post, err := NewPost(authorID, "Hello World Test", longContent(20), "Tech", []string{"go", "test"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.ID() == uuid.Nil {
		t.Error("post ID should not be nil")
	}
	if post.AuthorID() != authorID {
		t.Error("author ID mismatch")
	}
	if post.Title() != "Hello World Test" {
		t.Errorf("title mismatch: %q", post.Title())
	}
	if post.Category() != "Tech" {
		t.Errorf("category mismatch: %q", post.Category())
	}
	if post.LikeCount() != 0 {
		t.Errorf("initial like count should be 0, got %d", post.LikeCount())
	}
	if post.ReadTime() < 1 {
		t.Error("read time should be at least 1")
	}
	if post.Slug() == "" {
		t.Error("slug should not be empty")
	}
}

func TestNewPost_ChineseOnlyTitle(t *testing.T) {
	// slug 正则 \p{L} 支持 Unicode 字母，纯中文标题可以生成有效 slug
	post, err := NewPost(uuid.New(), "测试标题", longContent(20), "Tech", nil)
	if err != nil {
		t.Fatalf("unexpected error for Chinese title: %v", err)
	}
	if post.Slug() == "" {
		t.Error("slug should not be empty for Chinese title")
	}
}

func TestNewPost_EmptyTitle(t *testing.T) {
	_, err := NewPost(uuid.New(), "", longContent(20), "Tech", nil)
	if err == nil {
		t.Fatal("expected error for empty title")
	}
}

func TestNewPost_ShortContent(t *testing.T) {
	_, err := NewPost(uuid.New(), "My Title", "short", "Tech", nil)
	if err == nil {
		t.Fatal("expected error for content < 50 chars")
	}
}

func TestNewPost_NilTags(t *testing.T) {
	post, err := NewPost(uuid.New(), "Nil Tags Post", longContent(20), "Tech", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.Tags() == nil {
		t.Error("tags should default to empty slice, not nil")
	}
}

func TestPost_Edit(t *testing.T) {
	authorID := uuid.New()
	post, _ := NewPost(authorID, "Original Post", longContent(20), "Tech", nil)

	err := post.Edit(authorID, valueobject.RoleUser, "Updated Post", longContent(25), "Design", []string{"design"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.Title() != "Updated Post" {
		t.Errorf("title should be updated, got %q", post.Title())
	}
}

func TestPost_Edit_Forbidden(t *testing.T) {
	authorID := uuid.New()
	otherID := uuid.New()
	post, _ := NewPost(authorID, "My Post", longContent(20), "Tech", nil)

	err := post.Edit(otherID, valueobject.RoleUser, "Hacked", longContent(20), "Tech", nil)
	if err == nil {
		t.Fatal("expected forbidden error")
	}
}

func TestPost_Edit_AdminAllowed(t *testing.T) {
	authorID := uuid.New()
	adminID := uuid.New()
	post, _ := NewPost(authorID, "My Post", longContent(20), "Tech", nil)

	err := post.Edit(adminID, valueobject.RoleAdmin, "Admin Edit", longContent(20), "Tech", nil)
	if err != nil {
		t.Fatalf("admin should be allowed to edit: %v", err)
	}
}

func TestPost_CanDelete(t *testing.T) {
	authorID := uuid.New()
	post, _ := NewPost(authorID, "Deletable Post", longContent(20), "Tech", nil)

	if !post.CanDelete(authorID, valueobject.RoleUser) {
		t.Error("author should be able to delete")
	}
	if !post.CanDelete(uuid.New(), valueobject.RoleAdmin) {
		t.Error("admin should be able to delete")
	}
	if post.CanDelete(uuid.New(), valueobject.RoleUser) {
		t.Error("random user should not be able to delete")
	}
}

func TestPost_LikeCount(t *testing.T) {
	post, _ := NewPost(uuid.New(), "Like Test Post", longContent(20), "Tech", nil)

	post.IncrementLikes()
	post.IncrementLikes()
	if post.LikeCount() != 2 {
		t.Errorf("expected 2 likes, got %d", post.LikeCount())
	}

	post.DecrementLikes()
	if post.LikeCount() != 1 {
		t.Errorf("expected 1 like, got %d", post.LikeCount())
	}

	post.DecrementLikes()
	post.DecrementLikes()
	if post.LikeCount() != 0 {
		t.Error("like count should not go below 0")
	}
}

func TestBuildExcerpt(t *testing.T) {
	short := "短文"
	if result := buildExcerpt(short, 120); result != short {
		t.Errorf("short content should not be truncated, got %q", result)
	}

	long := longContent(50)
	result := buildExcerpt(long, 10)
	if !strings.HasSuffix(result, "...") {
		t.Errorf("truncated excerpt should end with '...', got %q", result)
	}
}

func TestEstimateReadTime(t *testing.T) {
	content := longContent(150) // 150 * 4 = 600 runes -> 2 minutes
	rt := estimateReadTime(content)
	if rt < 1 {
		t.Error("read time should be at least 1")
	}

	tiny := "Hi"
	if estimateReadTime(tiny) != 1 {
		t.Error("very short content should return 1 minute")
	}
}
