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

type Essay struct {
	id           uuid.UUID
	authorID     uuid.UUID
	title        string
	excerpt      string
	content      string
	likeCount    int
	reviewStatus string
	createdAt    time.Time
	updatedAt    time.Time

	authorName   string
	authorAvatar string
	authorHandle string
}

func NewEssay(authorID uuid.UUID, title, excerpt, content string) (*Essay, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return nil, errs.Validation("标题不能为空")
	}
	if utf8.RuneCountInString(title) > 20 {
		return nil, errs.Validation("标题不能超过 20 字符")
	}

	content = sanitize.HTML(strings.TrimSpace(content))
	if utf8.RuneCountInString(content) < 10 {
		return nil, errs.Validation("内容至少 10 字")
	}
	if utf8.RuneCountInString(content) > 500 {
		return nil, errs.Validation("内容不能超过 500 字")
	}

	excerpt = strings.TrimSpace(excerpt)
	if excerpt == "" {
		excerpt = buildExcerpt(content, 30)
	}

	now := time.Now()
	return &Essay{
		id:           idgen.New(),
		authorID:     authorID,
		title:        title,
		excerpt:      excerpt,
		content:      content,
		likeCount:    0,
		reviewStatus: "published",
		createdAt:    now,
		updatedAt:    now,
	}, nil
}

func ReconstructEssay(
	id, authorID uuid.UUID,
	title, excerpt, content string,
	likeCount int,
	authorName, authorAvatar, authorHandle, reviewStatus string,
	createdAt, updatedAt time.Time,
) *Essay {
	return &Essay{
		id:           id,
		authorID:     authorID,
		title:        title,
		excerpt:      excerpt,
		content:      content,
		likeCount:    likeCount,
		reviewStatus: reviewStatus,
		authorName:   authorName,
		authorAvatar: authorAvatar,
		authorHandle: authorHandle,
		createdAt:    createdAt,
		updatedAt:    updatedAt,
	}
}

func (e *Essay) Edit(editorID uuid.UUID, editorRole valueobject.Role, title, excerpt, content string) error {
	if e.authorID != editorID && !editorRole.IsAdmin() {
		return errs.Forbidden("只有作者或管理员可以编辑")
	}

	title = strings.TrimSpace(title)
	if title == "" {
		return errs.Validation("标题不能为空")
	}
	if utf8.RuneCountInString(title) > 20 {
		return errs.Validation("标题不能超过 20 字符")
	}

	content = sanitize.HTML(strings.TrimSpace(content))
	if utf8.RuneCountInString(content) < 10 {
		return errs.Validation("内容至少 10 字")
	}
	if utf8.RuneCountInString(content) > 500 {
		return errs.Validation("内容不能超过 500 字")
	}

	excerpt = strings.TrimSpace(excerpt)
	if excerpt == "" {
		excerpt = buildExcerpt(content, 30)
	}

	e.title = title
	e.excerpt = excerpt
	e.content = content
	e.updatedAt = time.Now()
	return nil
}

func (e *Essay) CanDelete(userID uuid.UUID, role valueobject.Role) bool {
	return e.authorID == userID || role.IsAdmin()
}

func (e *Essay) IncrementLikes() { e.likeCount++ }
func (e *Essay) DecrementLikes() {
	if e.likeCount > 0 {
		e.likeCount--
	}
}

func (e *Essay) ID() uuid.UUID         { return e.id }
func (e *Essay) AuthorID() uuid.UUID   { return e.authorID }
func (e *Essay) Title() string         { return e.title }
func (e *Essay) Excerpt() string       { return e.excerpt }
func (e *Essay) Content() string       { return e.content }
func (e *Essay) LikeCount() int        { return e.likeCount }
func (e *Essay) ReviewStatus() string  { return e.reviewStatus }
func (e *Essay) AuthorName() string    { return e.authorName }
func (e *Essay) AuthorAvatar() string  { return e.authorAvatar }
func (e *Essay) AuthorHandle() string  { return e.authorHandle }
func (e *Essay) CreatedAt() time.Time  { return e.createdAt }
func (e *Essay) UpdatedAt() time.Time  { return e.updatedAt }
