package entity

import (
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/errs"
	"xoberon-server/pkg/idgen"
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/pkg/sanitize"
)

type Contact struct {
	id        uuid.UUID
	name      string
	email     valueobject.Email
	message   string
	isRead    bool
	createdAt time.Time
}

func NewContact(name, emailRaw, message string) (*Contact, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errs.Validation("姓名不能为空")
	}
	if utf8.RuneCountInString(name) > 100 {
		return nil, errs.Validation("姓名不能超过 100 个字符")
	}

	email, err := valueobject.NewEmail(emailRaw)
	if err != nil {
		return nil, err
	}

	message = sanitize.HTML(strings.TrimSpace(message))
	if message == "" {
		return nil, errs.Validation("消息内容不能为空")
	}
	if utf8.RuneCountInString(message) > 5000 {
		return nil, errs.Validation("消息不能超过 5000 字符")
	}

	return &Contact{
		id:        idgen.New(),
		name:      name,
		email:     email,
		message:   message,
		isRead:    false,
		createdAt: time.Now(),
	}, nil
}

func ReconstructContact(
	id uuid.UUID, name, email, message string, isRead bool, createdAt time.Time,
) *Contact {
	return &Contact{
		id:        id,
		name:      name,
		email:     valueobject.LoadEmail(email),
		message:   message,
		isRead:    isRead,
		createdAt: createdAt,
	}
}

func (c *Contact) MarkRead() {
	c.isRead = true
}

func (c *Contact) ID() uuid.UUID           { return c.id }
func (c *Contact) Name() string             { return c.name }
func (c *Contact) Email() valueobject.Email { return c.email }
func (c *Contact) Message() string          { return c.message }
func (c *Contact) IsRead() bool             { return c.isRead }
func (c *Contact) CreatedAt() time.Time     { return c.createdAt }
