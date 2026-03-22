package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"xoberon-server/internal/domain/errs"
	"xoberon-server/pkg/idgen"
	"xoberon-server/internal/infra/config"
)

// Claims JWT 载荷
type Claims struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	Role     string    `json:"role"`
	jwt.RegisteredClaims
}

// JWTManager JWT 签发与验证
type JWTManager struct {
	secret            []byte
	accessExpiration  time.Duration
	refreshExpiration time.Duration
}

func NewJWTManager(cfg config.JWTConfig) *JWTManager {
	return &JWTManager{
		secret:            []byte(cfg.Secret),
		accessExpiration:  cfg.AccessExpiration,
		refreshExpiration: cfg.RefreshExpiration,
	}
}

// GenerateAccessToken 签发访问令牌
func (m *JWTManager) GenerateAccessToken(userID uuid.UUID, username, role string) (string, error) {
	return m.generate(userID, username, role, m.accessExpiration)
}

// GenerateRefreshToken 签发刷新令牌
func (m *JWTManager) GenerateRefreshToken(userID uuid.UUID, username, role string) (string, error) {
	return m.generate(userID, username, role, m.refreshExpiration)
}

func (m *JWTManager) generate(userID uuid.UUID, username, role string, expiration time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        idgen.New().String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(expiration)),
			Issuer:    "xoberon",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return "", errs.Wrap(errs.CodeInternal, "签发 token 失败", err)
	}
	return signed, nil
}

// Validate 校验 token 并返回载荷
func (m *JWTManager) Validate(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errs.Unauthorized("无效的签名算法")
		}
		return m.secret, nil
	})
	if err != nil {
		return nil, errs.Unauthorized("token 无效或已过期")
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errs.Unauthorized("token 无效")
	}
	return claims, nil
}
