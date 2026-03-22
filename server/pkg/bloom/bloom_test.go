package bloom

import (
	"fmt"
	"sync"
	"testing"
)

func TestAddAndMightExist(t *testing.T) {
	f := New(1000, 0.0001)

	f.Add("hello-world")
	f.Add("my-first-post")

	if !f.MightExist("hello-world") {
		t.Error("expected hello-world to exist")
	}
	if !f.MightExist("my-first-post") {
		t.Error("expected my-first-post to exist")
	}
	if f.MightExist("does-not-exist") {
		t.Error("unexpected false positive for does-not-exist")
	}
}

func TestRebuild(t *testing.T) {
	f := New(1000, 0.0001)

	f.Add("old-slug")
	if !f.MightExist("old-slug") {
		t.Fatal("old-slug should exist before rebuild")
	}

	f.Rebuild([]string{"new-slug-a", "new-slug-b"})

	if f.MightExist("old-slug") {
		t.Error("old-slug should NOT exist after rebuild")
	}
	if !f.MightExist("new-slug-a") {
		t.Error("new-slug-a should exist after rebuild")
	}
	if !f.MightExist("new-slug-b") {
		t.Error("new-slug-b should exist after rebuild")
	}
}

func TestConcurrentAccess(t *testing.T) {
	f := New(10000, 0.0001)
	var wg sync.WaitGroup

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			slug := fmt.Sprintf("slug-%d", n)
			f.Add(slug)
			f.MightExist(slug)
		}(i)
	}
	wg.Wait()

	for i := 0; i < 100; i++ {
		slug := fmt.Sprintf("slug-%d", i)
		if !f.MightExist(slug) {
			t.Errorf("expected %s to exist after concurrent adds", slug)
		}
	}
}

func TestNoFalseNegatives(t *testing.T) {
	f := New(10000, 0.0001)
	slugs := make([]string, 5000)
	for i := range slugs {
		slugs[i] = fmt.Sprintf("post-slug-%d", i)
	}
	f.Rebuild(slugs)

	for _, s := range slugs {
		if !f.MightExist(s) {
			t.Fatalf("false negative detected for %s — bloom filters must not have false negatives", s)
		}
	}
}
