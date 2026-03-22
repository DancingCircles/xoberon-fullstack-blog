package valueobject

import "xoberon-server/internal/domain/errs"

type Role string

const (
	RoleUser  Role = "user"
	RoleAdmin Role = "admin"
	RoleOwner Role = "owner"
)

func NewRole(raw string) (Role, error) {
	switch Role(raw) {
	case RoleUser, RoleAdmin, RoleOwner:
		return Role(raw), nil
	default:
		return "", errs.Validationf("无效的角色: %s", raw)
	}
}

func (r Role) String() string { return string(r) }
func (r Role) IsAdmin() bool  { return r == RoleAdmin || r == RoleOwner }
func (r Role) IsOwner() bool  { return r == RoleOwner }
