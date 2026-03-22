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

type Comment struct {
	id           uuid.UUID
	postID       uuid.UUID
	authorID     uuid.UUID
	content      string
	reviewStatus string
	createdAt    time.Time

	authorName   string
	authorAvatar string
}

func NewComment(postID, authorID uuid.UUID, content string) (*Comment, error) {
	content = sanitize.HTML(strings.TrimSpace(content))
	if content == "" {
		return nil, errs.Validation("评论内容不能为空")
	}
	if utf8.RuneCountInString(content) > 2000 {
		return nil, errs.Validation("评论不能超过 2000 字符")
	}

	return &Comment{
		id:           idgen.New(),
		postID:       postID,
		authorID:     authorID,
		content:      content,
		reviewStatus: "published",
		createdAt:    time.Now(),
	}, nil
}

func ReconstructComment(
	id, postID, authorID uuid.UUID,
	content, authorName, authorAvatar, reviewStatus string,
	createdAt time.Time,
) *Comment {
	return &Comment{
		id:           id,
		postID:       postID,
		authorID:     authorID,
		content:      content,
		reviewStatus: reviewStatus,
		authorName:   authorName,
		authorAvatar: authorAvatar,
		createdAt:    createdAt,
	}
}

func (c *Comment) CanDelete(userID uuid.UUID, role valueobject.Role) bool {
	return c.authorID == userID || role.IsAdmin()
}

func (c *Comment) ID() uuid.UUID         { return c.id }
func (c *Comment) PostID() uuid.UUID     { return c.postID }
func (c *Comment) AuthorID() uuid.UUID   { return c.authorID }
func (c *Comment) Content() string       { return c.content }
func (c *Comment) ReviewStatus() string  { return c.reviewStatus }
func (c *Comment) AuthorName() string    { return c.authorName }
func (c *Comment) AuthorAvatar() string  { return c.authorAvatar }
func (c *Comment) CreatedAt() time.Time  { return c.createdAt }
