package valueobject

import (
	"strings"
	"testing"
)

func TestNewSlug_Basic(t *testing.T) {
	slug, err := NewSlug("Hello World")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	s := slug.String()
	if !strings.HasPrefix(s, "hello-world-") {
		t.Errorf("slug %q should start with 'hello-world-'", s)
	}
	// 随机后缀应是 8 个十六进制字符
	parts := strings.Split(s, "-")
	suffix := parts[len(parts)-1]
	if len(suffix) != 8 {
		t.Errorf("expected 8-char hex suffix, got %q (len=%d)", suffix, len(suffix))
	}
}

func TestNewSlug_Empty(t *testing.T) {
	_, err := NewSlug("")
	if err == nil {
		t.Fatal("expected error for empty title")
	}
}

func TestNewSlug_SpecialChars(t *testing.T) {
	slug, err := NewSlug("Go 1.25: What's New!")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	s := slug.String()
	if strings.ContainsAny(s, " !:'") {
		t.Errorf("slug %q should not contain special chars", s)
	}
}

func TestNewSlug_Uniqueness(t *testing.T) {
	s1, _ := NewSlug("Same Title")
	s2, _ := NewSlug("Same Title")
	if s1.String() == s2.String() {
		t.Error("two slugs from same title should differ due to random suffix")
	}
}

func TestLoadSlug(t *testing.T) {
	s := LoadSlug("my-slug-abc12345")
	if s.String() != "my-slug-abc12345" {
		t.Errorf("LoadSlug mismatch: %q", s.String())
	}
	if s.IsZero() {
		t.Error("loaded slug should not be zero")
	}
}
