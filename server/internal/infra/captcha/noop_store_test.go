package captcha

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNoopStore_SetAndGet(t *testing.T) {
	s := NewNoopStore()
	defer s.Close()

	err := s.Set("id1", "abcd")
	assert.NoError(t, err)

	val := s.Get("id1", false)
	assert.Equal(t, "abcd", val)
}

func TestNoopStore_GetClear(t *testing.T) {
	s := NewNoopStore()
	defer s.Close()

	_ = s.Set("id1", "abcd")

	val := s.Get("id1", true)
	assert.Equal(t, "abcd", val)

	val = s.Get("id1", false)
	assert.Empty(t, val)
}

func TestNoopStore_GetNotFound(t *testing.T) {
	s := NewNoopStore()
	defer s.Close()

	val := s.Get("nonexistent", false)
	assert.Empty(t, val)
}

func TestNoopStore_GetExpired(t *testing.T) {
	s := NewNoopStore()
	defer s.Close()

	s.data.Store("expired", entry{value: "old", expiresAt: time.Now().Add(-1 * time.Second)})

	val := s.Get("expired", false)
	assert.Empty(t, val)
}

func TestNoopStore_Verify(t *testing.T) {
	s := NewNoopStore()
	defer s.Close()

	_ = s.Set("id1", "abcd")

	assert.True(t, s.Verify("id1", "abcd", false))
	assert.False(t, s.Verify("id1", "wrong", false))
	assert.False(t, s.Verify("missing", "abcd", false))
}

func TestNoopStore_VerifyClear(t *testing.T) {
	s := NewNoopStore()
	defer s.Close()

	_ = s.Set("id1", "abcd")

	assert.True(t, s.Verify("id1", "abcd", true))
	assert.False(t, s.Verify("id1", "abcd", false))
}
