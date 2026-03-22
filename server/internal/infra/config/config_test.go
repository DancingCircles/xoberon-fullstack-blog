package config_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"xoberon-server/internal/infra/config"
)

func TestConfig_LoadDefaults(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret-key-must-be-at-least-32-bytes-long!!")
	t.Setenv("DB_USER", "testuser")
	t.Setenv("DB_NAME", "testdb")

	cfg, err := config.Load()
	require.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, "8080", cfg.Server.Port)
	assert.Equal(t, "9091", cfg.Server.MetricsPort)
	assert.Equal(t, "test-secret-key-must-be-at-least-32-bytes-long!!", cfg.JWT.Secret)
	assert.Equal(t, "testuser", cfg.DB.User)
	assert.Equal(t, "testdb", cfg.DB.Name)
}

func TestConfig_MissingJWTSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "")
	t.Setenv("DB_USER", "testuser")
	t.Setenv("DB_NAME", "testdb")

	_, err := config.Load()
	assert.Error(t, err)
}

func TestConfig_ShortJWTSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "short")
	t.Setenv("DB_USER", "testuser")
	t.Setenv("DB_NAME", "testdb")

	_, err := config.Load()
	assert.Error(t, err)
}
