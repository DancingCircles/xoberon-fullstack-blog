package auth

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLocalLoginLimiter_CheckUnlocked(t *testing.T) {
	l := NewLocalLoginLimiter()
	defer l.Close()

	locked, err := l.Check(context.Background(), "testuser")
	assert.NoError(t, err)
	assert.False(t, locked)
}

func TestLocalLoginLimiter_LockAfterMaxAttempts(t *testing.T) {
	l := NewLocalLoginLimiter()
	defer l.Close()

	ctx := context.Background()
	for i := 0; i < maxLoginAttempts; i++ {
		err := l.RecordFailure(ctx, "testuser")
		assert.NoError(t, err)
	}

	locked, err := l.Check(ctx, "testuser")
	assert.NoError(t, err)
	assert.True(t, locked)
}

func TestLocalLoginLimiter_ResetUnlocks(t *testing.T) {
	l := NewLocalLoginLimiter()
	defer l.Close()

	ctx := context.Background()
	for i := 0; i < maxLoginAttempts; i++ {
		_ = l.RecordFailure(ctx, "testuser")
	}

	locked, _ := l.Check(ctx, "testuser")
	assert.True(t, locked)

	err := l.Reset(ctx, "testuser")
	assert.NoError(t, err)

	locked, err = l.Check(ctx, "testuser")
	assert.NoError(t, err)
	assert.False(t, locked)
}

func TestLocalLoginLimiter_Close(t *testing.T) {
	l := NewLocalLoginLimiter()
	assert.NotPanics(t, func() {
		l.Close()
	})
}
