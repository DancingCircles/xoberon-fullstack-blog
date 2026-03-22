package noop_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"xoberon-server/internal/infra/persistence/noop"
)

func TestLocalBlacklist_RevokeAndCheck(t *testing.T) {
	b := noop.NewLocalTokenBlacklist()
	defer b.Close()

	ctx := context.Background()
	jti := "test-jti-123"
	b.Revoke(ctx, jti, 5*time.Minute)

	revoked, err := b.IsRevoked(ctx, jti)
	assert.NoError(t, err)
	assert.True(t, revoked)
}

func TestLocalBlacklist_NotRevoked(t *testing.T) {
	b := noop.NewLocalTokenBlacklist()
	defer b.Close()

	ctx := context.Background()
	revoked, err := b.IsRevoked(ctx, "non-existent-jti")
	assert.NoError(t, err)
	assert.False(t, revoked)
}

func TestLocalBlacklist_Close(t *testing.T) {
	b := noop.NewLocalTokenBlacklist()
	b.Revoke(context.Background(), "jti", time.Minute)
	assert.NotPanics(t, func() { b.Close() })
}
