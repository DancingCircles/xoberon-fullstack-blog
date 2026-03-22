package entity

import (
	"fmt"
	"math/rand"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/errs"
	"xoberon-server/pkg/idgen"
	"xoberon-server/internal/domain/valueobject"
)

type User struct {
	id        uuid.UUID
	username  string
	email     valueobject.Email
	password  valueobject.Password
	name      string
	handle    string
	avatar    string
	bio       string
	role      valueobject.Role
	createdAt time.Time
	updatedAt time.Time
}

// NewUser 注册新用户
func NewUser(username, emailRaw, passwordRaw, name string) (*User, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		return nil, errs.Validation("用户名不能为空")
	}
	if len(username) < 3 || len(username) > 50 {
		return nil, errs.Validation("用户名长度须在 3-50 之间")
	}

	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errs.Validation("名称不能为空")
	}
	if utf8.RuneCountInString(name) > 100 {
		return nil, errs.Validation("名称不能超过 100 个字符")
	}

	email, err := valueobject.NewEmail(emailRaw)
	if err != nil {
		return nil, err
	}

	password, err := valueobject.NewPassword(passwordRaw)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	// 随机分配 1-10 的默认头像
	defaultAvatar := fmt.Sprintf("/avatars/avatar-%d.png", rand.Intn(10)+1)

	return &User{
		id:        idgen.New(),
		username:  username,
		email:     email,
		password:  password,
		name:      name,
		handle:    "@" + username,
		avatar:    defaultAvatar,
		bio:       "",
		role:      valueobject.RoleUser,
		createdAt: now,
		updatedAt: now,
	}, nil
}

// ReconstructUser 从数据库重建实体
func ReconstructUser(
	id uuid.UUID, username, email, passwordHash, name, handle, avatar, bio, role string,
	createdAt, updatedAt time.Time,
) *User {
	r, _ := valueobject.NewRole(role)
	return &User{
		id:        id,
		username:  username,
		email:     valueobject.LoadEmail(email),
		password:  valueobject.LoadPassword(passwordHash),
		name:      name,
		handle:    handle,
		avatar:    avatar,
		bio:       bio,
		role:      r,
		createdAt: createdAt,
		updatedAt: updatedAt,
	}
}

// ---- 业务方法 ----

func (u *User) VerifyPassword(raw string) bool {
	return u.password.Verify(raw)
}

func (u *User) UpdateProfile(name, bio, avatar string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errs.Validation("名称不能为空")
	}
	if utf8.RuneCountInString(name) > 100 {
		return errs.Validation("名称不能超过 100 个字符")
	}

	bio = strings.TrimSpace(bio)
	if utf8.RuneCountInString(bio) > 500 {
		return errs.Validation("个人简介不能超过 500 个字符")
	}

	avatar = strings.TrimSpace(avatar)
	if utf8.RuneCountInString(avatar) > 500 {
		return errs.Validation("头像链接过长")
	}

	u.name = name
	u.bio = bio
	u.avatar = avatar
	u.updatedAt = time.Now()
	return nil
}

func (u *User) ChangePassword(oldRaw, newRaw string) error {
	if !u.password.Verify(oldRaw) {
		return errs.Unauthorized("旧密码不正确")
	}
	pw, err := valueobject.NewPassword(newRaw)
	if err != nil {
		return err
	}
	u.password = pw
	u.updatedAt = time.Now()
	return nil
}

func (u *User) PromoteTo(role valueobject.Role) {
	u.role = role
	u.updatedAt = time.Now()
}

// ---- Getters ----

func (u *User) ID() uuid.UUID              { return u.id }
func (u *User) Username() string            { return u.username }
func (u *User) Email() valueobject.Email    { return u.email }
func (u *User) PasswordHash() string        { return u.password.Hash() }
func (u *User) Name() string                { return u.name }
func (u *User) Handle() string              { return u.handle }
func (u *User) Avatar() string              { return u.avatar }
func (u *User) Bio() string                 { return u.bio }
func (u *User) Role() valueobject.Role      { return u.role }
func (u *User) CreatedAt() time.Time        { return u.createdAt }
func (u *User) UpdatedAt() time.Time        { return u.updatedAt }
