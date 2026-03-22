package idgen

import (
	"testing"
)

func TestNew_ReturnsVersion7(t *testing.T) {
	id := New()
	if id.Version() != 7 {
		t.Errorf("期望 UUID version 7, 实际为 %d", id.Version())
	}
}

func TestNew_MonotonicallyIncreasing(t *testing.T) {
	const n = 1000
	ids := make([]string, n)
	for i := range ids {
		ids[i] = New().String()
	}

	for i := 1; i < n; i++ {
		if ids[i] < ids[i-1] {
			t.Fatalf("UUID 不单调递增: ids[%d]=%s > ids[%d]=%s", i-1, ids[i-1], i, ids[i])
		}
	}
}

func BenchmarkNew(b *testing.B) {
	for b.Loop() {
		New()
	}
}
