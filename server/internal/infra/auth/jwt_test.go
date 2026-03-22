package auth_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"xoberon-server/internal/infra/auth"
	"xoberon-server/internal/infra/config"
)

func TestJWT_GenerateToken(t *testing.T) {
	cfg := config.JWTConfig{
		Secret:            "test-secret-key-must-be-at-least-32-bytes-long!!",
		AccessExpiration:  24 * time.Hour,
		RefreshExpiration: 168 * time.Hour,
	}
	m := auth.NewJWTManager(cfg)
	token, err := m.GenerateAccessToken(uuid.New(), "testuser", "user")
	require.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestJWT_ValidateValidToken(t *testing.T) {
	cfg := config.JWTConfig{
		Secret:            "test-secret-key-must-be-at-least-32-bytes-long!!",
		AccessExpiration:  24 * time.Hour,
		RefreshExpiration: 168 * time.Hour,
	}
	m := auth.NewJWTManager(cfg)
	userID := uuid.New()
	token, err := m.GenerateAccessToken(userID, "testuser", "admin")
	require.NoError(t, err)

	claims, err := m.Validate(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, "testuser", claims.Username)
	assert.Equal(t, "admin", claims.Role)
}

func TestJWT_ValidateExpiredToken(t *testing.T) {
	cfg := config.JWTConfig{
		Secret:            "test-secret-key-must-be-at-least-32-bytes-long!!",
		AccessExpiration:  -1 * time.Second,
		RefreshExpiration: 168 * time.Hour,
	}
	m := auth.NewJWTManager(cfg)
	token, err := m.GenerateAccessToken(uuid.New(), "testuser", "user")
	require.NoError(t, err)

	_, err = m.Validate(token)
	assert.Error(t, err)
}

func TestJWT_ValidateInvalidToken(t *testing.T) {
	cfg := config.JWTConfig{
		Secret:            "test-secret-key-must-be-at-least-32-bytes-long!!",
		AccessExpiration:  24 * time.Hour,
		RefreshExpiration: 168 * time.Hour,
	}
	m := auth.NewJWTManager(cfg)

	_, err := m.Validate("garbage-invalid-token")
	assert.Error(t, err)
}

func TestJWT_ValidateWrongSecret(t *testing.T) {
	cfg1 := config.JWTConfig{
		Secret:            "test-secret-key-must-be-at-least-32-bytes-long!!",
		AccessExpiration:  24 * time.Hour,
		RefreshExpiration: 168 * time.Hour,
	}
	m1 := auth.NewJWTManager(cfg1)
	token, err := m1.GenerateAccessToken(uuid.New(), "testuser", "user")
	require.NoError(t, err)

	cfg2 := config.JWTConfig{
		Secret:            "different-secret-key-must-be-32-bytes-long!!!",
		AccessExpiration:  24 * time.Hour,
		RefreshExpiration: 168 * time.Hour,
	}
	m2 := auth.NewJWTManager(cfg2)
	_, err = m2.Validate(token)
	assert.Error(t, err)
}
