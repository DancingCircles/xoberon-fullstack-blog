package entity

import (
	"math"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/errs"
	"xoberon-server/pkg/idgen"
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/pkg/sanitize"
)

type Post struct {
	id           uuid.UUID
	authorID     uuid.UUID
	title        string
	slug         valueobject.Slug
	excerpt      string
	content      string
	category     string
	tags         []string
	likeCount    int
	readTime     int
	reviewStatus string
	createdAt    time.Time
	updatedAt    time.Time

	// 聚合加载的关联字段（非持久化字段）
	authorName   string
	authorAvatar string
	authorHandle string
}

// AllowedCategories 文章允许的分类白名单（与 DB CHECK 约束保持一致）
var AllowedCategories = map[string]bool{"Design": true, "Tech": true, "Culture": true}

func validateCategory(category string) error {
	if !AllowedCategories[category] {
		return errs.Validationf("无效的分类: %s，可选值为 Design/Tech/Culture", category)
	}
	return nil
}

func validateTags(tags []string) error {
	if len(tags) > 3 {
		return errs.Validation("标签数量不能超过 3 个")
	}
	for _, t := range tags {
		if utf8.RuneCountInString(t) > 30 {
			return errs.Validation("单个标签不能超过 30 字符")
		}
	}
	return nil
}

// NewPost 创建新文章
func NewPost(authorID uuid.UUID, title, content, category string, tags []string) (*Post, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return nil, errs.Validation("标题不能为空")
	}
	if utf8.RuneCountInString(title) > 30 {
		return nil, errs.Validation("标题不能超过 30 字符")
	}

	content = sanitize.HTML(strings.TrimSpace(content))
	if utf8.RuneCountInString(content) < 20 {
		return nil, errs.Validation("内容至少 20 字")
	}
	if utf8.RuneCountInString(content) > 2000 {
		return nil, errs.Validation("内容不能超过 2000 字")
	}

	category = strings.TrimSpace(category)
	if err := validateCategory(category); err != nil {
		return nil, err
	}

	slug, err := valueobject.NewSlug(title)
	if err != nil {
		return nil, err
	}

	if tags == nil {
		tags = []string{}
	}
	if err := validateTags(tags); err != nil {
		return nil, err
	}

	now := time.Now()
	return &Post{
		id:           idgen.New(),
		authorID:     authorID,
		title:        title,
		slug:         slug,
		excerpt:      buildExcerpt(content, 120),
		content:      content,
		category:     category,
		tags:         tags,
		likeCount:    0,
		readTime:     estimateReadTime(content),
		reviewStatus: "published",
		createdAt:    now,
		updatedAt:    now,
	}, nil
}

// ReconstructPost 从数据库重建
func ReconstructPost(
	id, authorID uuid.UUID,
	title, slug, excerpt, content, category string,
	tags []string, likeCount, readTime int,
	authorName, authorAvatar, authorHandle string,
	reviewStatus string,
	createdAt, updatedAt time.Time,
) *Post {
	return &Post{
		id:           id,
		authorID:     authorID,
		title:        title,
		slug:         valueobject.LoadSlug(slug),
		excerpt:      excerpt,
		content:      content,
		category:     category,
		tags:         tags,
		likeCount:    likeCount,
		readTime:     readTime,
		reviewStatus: reviewStatus,
		authorName:   authorName,
		authorAvatar: authorAvatar,
		authorHandle: authorHandle,
		createdAt:    createdAt,
		updatedAt:    updatedAt,
	}
}

// ---- 业务方法 ----

// Edit 编辑文章（仅作者或管理员）
func (p *Post) Edit(editorID uuid.UUID, editorRole valueobject.Role, title, content, category string, tags []string) error {
	if p.authorID != editorID && !editorRole.IsAdmin() {
		return errs.Forbidden("只有作者或管理员可以编辑")
	}

	title = strings.TrimSpace(title)
	if title == "" {
		return errs.Validation("标题不能为空")
	}
	if utf8.RuneCountInString(title) > 30 {
		return errs.Validation("标题不能超过 30 字符")
	}

	content = sanitize.HTML(strings.TrimSpace(content))
	if utf8.RuneCountInString(content) < 20 {
		return errs.Validation("内容至少 20 字")
	}
	if utf8.RuneCountInString(content) > 2000 {
		return errs.Validation("内容不能超过 2000 字")
	}

	category = strings.TrimSpace(category)
	if err := validateCategory(category); err != nil {
		return err
	}

	if err := validateTags(tags); err != nil {
		return err
	}

	p.title = title
	p.excerpt = buildExcerpt(content, 120)
	p.content = content
	p.category = category
	p.tags = tags
	p.readTime = estimateReadTime(content)
	p.updatedAt = time.Now()
	return nil
}

// CanDelete 判断是否有权删除
func (p *Post) CanDelete(userID uuid.UUID, role valueobject.Role) bool {
	return p.authorID == userID || role.IsAdmin()
}

// IncrementLikes 点赞 +1
func (p *Post) IncrementLikes() { p.likeCount++ }

// DecrementLikes 取消点赞 -1
func (p *Post) DecrementLikes() {
	if p.likeCount > 0 {
		p.likeCount--
	}
}

// ---- Getters ----

func (p *Post) ID() uuid.UUID         { return p.id }
func (p *Post) AuthorID() uuid.UUID   { return p.authorID }
func (p *Post) Title() string         { return p.title }
func (p *Post) Slug() string          { return p.slug.String() }
func (p *Post) Excerpt() string       { return p.excerpt }
func (p *Post) Content() string       { return p.content }
func (p *Post) Category() string      { return p.category }
func (p *Post) Tags() []string        { return p.tags }
func (p *Post) LikeCount() int        { return p.likeCount }
func (p *Post) ReadTime() int         { return p.readTime }
func (p *Post) ReviewStatus() string  { return p.reviewStatus }
func (p *Post) AuthorName() string    { return p.authorName }
func (p *Post) AuthorAvatar() string  { return p.authorAvatar }
func (p *Post) AuthorHandle() string  { return p.authorHandle }
func (p *Post) CreatedAt() time.Time  { return p.createdAt }
func (p *Post) UpdatedAt() time.Time  { return p.updatedAt }

// Flag 标记为疑似违规（AI 巡查发现）
func (p *Post) Flag()    { p.reviewStatus = "flagged" }

// Hide 隐藏帖子（管理员拒绝）
func (p *Post) Hide()    { p.reviewStatus = "hidden" }

// Restore 恢复为已发布（管理员审批通过）
func (p *Post) Restore() { p.reviewStatus = "published" }

// ---- 内部工具 ----

func buildExcerpt(content string, maxLen int) string {
	runes := []rune(content)
	if len(runes) <= maxLen {
		return string(runes)
	}
	return string(runes[:maxLen]) + "..."
}

// 按平均阅读速度 300 字/分钟估算
func estimateReadTime(content string) int {
	words := utf8.RuneCountInString(content)
	minutes := math.Ceil(float64(words) / 300.0)
	if minutes < 1 {
		return 1
	}
	return int(minutes)
}
