package query

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
)

func TestCachedPost_RoundTrip(t *testing.T) {
	authorID := uuid.New()
	post, err := entity.NewPost(authorID, "Round Trip Test", strings.Repeat("test content ", 10), "Tech", []string{"go", "cache"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	dto := toCachedPost(post)

	data, err := json.Marshal(dto)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var restored CachedPost
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	rebuilt := restored.toEntity()

	if rebuilt.ID() != post.ID() {
		t.Errorf("ID mismatch: %s vs %s", rebuilt.ID(), post.ID())
	}
	if rebuilt.Title() != post.Title() {
		t.Errorf("Title mismatch: %q vs %q", rebuilt.Title(), post.Title())
	}
	if rebuilt.Slug() != post.Slug() {
		t.Errorf("Slug mismatch: %q vs %q", rebuilt.Slug(), post.Slug())
	}
	if rebuilt.Category() != post.Category() {
		t.Errorf("Category mismatch: %q vs %q", rebuilt.Category(), post.Category())
	}
	if len(rebuilt.Tags()) != len(post.Tags()) {
		t.Errorf("Tags count mismatch: %d vs %d", len(rebuilt.Tags()), len(post.Tags()))
	}
}

func TestCachedListResult_RoundTrip(t *testing.T) {
	authorID := uuid.New()
	post, _ := entity.NewPost(authorID, "List Test", strings.Repeat("list content ", 10), "Design", nil)

	result := cachedListResult{
		Posts: []CachedPost{toCachedPost(post)},
		Total: 42,
	}

	data, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	if !strings.Contains(string(data), "List Test") {
		t.Error("serialized data should contain the post title")
	}

	var restored cachedListResult
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if restored.Total != 42 {
		t.Errorf("total mismatch: %d", restored.Total)
	}
	if len(restored.Posts) != 1 {
		t.Fatalf("expected 1 post, got %d", len(restored.Posts))
	}
	if restored.Posts[0].Title != "List Test" {
		t.Errorf("post title mismatch: %q", restored.Posts[0].Title)
	}
}

func TestCachedEssay_RoundTrip(t *testing.T) {
	essay := entity.ReconstructEssay(
		uuid.New(), uuid.New(),
		"Essay Title", "excerpt", "essay content body", 5,
		"X", "https://example.com/avatar.jpg", "x",
		"published",
		time.Now(), time.Now(),
	)

	dto := toCachedEssay(essay)
	data, err := json.Marshal(dto)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var restored CachedEssay
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	rebuilt := restored.toEntity()
	if rebuilt.Title() != "Essay Title" {
		t.Errorf("title mismatch: %q", rebuilt.Title())
	}
	if rebuilt.LikeCount() != 5 {
		t.Errorf("like count mismatch: %d", rebuilt.LikeCount())
	}
	if rebuilt.AuthorName() != "X" {
		t.Errorf("author name mismatch: %q", rebuilt.AuthorName())
	}
}

func TestCachedComment_RoundTrip(t *testing.T) {
	comment := entity.ReconstructComment(
		uuid.New(), uuid.New(), uuid.New(),
		"Hello comment", "X", "https://example.com/avatar.jpg", "published",
		time.Now(),
	)

	dto := toCachedComment(comment)
	data, err := json.Marshal(dto)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var restored CachedComment
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	rebuilt := restored.toEntity()
	if rebuilt.Content() != "Hello comment" {
		t.Errorf("content mismatch: %q", rebuilt.Content())
	}
	if rebuilt.AuthorName() != "X" {
		t.Errorf("author name mismatch: %q", rebuilt.AuthorName())
	}
}
