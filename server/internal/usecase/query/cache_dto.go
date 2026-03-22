package query

import (
	"time"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
)

// CachedPost 缓存专用 DTO，导出字段 + json tag 保证可序列化
type CachedPost struct {
	ID              string    `json:"id"`
	AuthorID        string    `json:"author_id"`
	Title           string    `json:"title"`
	Slug            string    `json:"slug"`
	Excerpt         string    `json:"excerpt"`
	Content         string    `json:"content"`
	Category        string    `json:"category"`
	Tags            []string  `json:"tags"`
	LikeCount       int       `json:"like_count"`
	ReadTime        int       `json:"read_time"`
	ReviewStatus    string    `json:"review_status"`
	AuthorName      string    `json:"author_name"`
	AuthorAvatar    string    `json:"author_avatar"`
	AuthorHandle    string    `json:"author_handle"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type CachedComment struct {
	ID           string    `json:"id"`
	PostID       string    `json:"post_id"`
	AuthorID     string    `json:"author_id"`
	Content      string    `json:"content"`
	ReviewStatus string    `json:"review_status"`
	AuthorName   string    `json:"author_name"`
	AuthorAvatar string    `json:"author_avatar"`
	CreatedAt    time.Time `json:"created_at"`
}

type cachedListResult struct {
	Posts []CachedPost `json:"posts"`
	Total int64        `json:"total"`
}

type cachedPostDetail struct {
	Post     CachedPost      `json:"post"`
	Comments []CachedComment `json:"comments"`
}

// ---- 实体 → 缓存 DTO 转换 ----

func toCachedPost(p *entity.Post) CachedPost {
	tags := p.Tags()
	if tags == nil {
		tags = []string{}
	}
	return CachedPost{
		ID:           p.ID().String(),
		AuthorID:     p.AuthorID().String(),
		Title:        p.Title(),
		Slug:         p.Slug(),
		Excerpt:      p.Excerpt(),
		Content:      p.Content(),
		Category:     p.Category(),
		Tags:         tags,
		LikeCount:    p.LikeCount(),
		ReadTime:     p.ReadTime(),
		ReviewStatus: p.ReviewStatus(),
		AuthorName:   p.AuthorName(),
		AuthorAvatar: p.AuthorAvatar(),
		AuthorHandle: p.AuthorHandle(),
		CreatedAt:    p.CreatedAt(),
		UpdatedAt:    p.UpdatedAt(),
	}
}

func toCachedComment(c *entity.Comment) CachedComment {
	return CachedComment{
		ID:           c.ID().String(),
		PostID:       c.PostID().String(),
		AuthorID:     c.AuthorID().String(),
		Content:      c.Content(),
		ReviewStatus: c.ReviewStatus(),
		AuthorName:   c.AuthorName(),
		AuthorAvatar: c.AuthorAvatar(),
		CreatedAt:    c.CreatedAt(),
	}
}

// CachedEssay 随笔缓存 DTO
type CachedEssay struct {
	ID           string    `json:"id"`
	AuthorID     string    `json:"author_id"`
	Title        string    `json:"title"`
	Excerpt      string    `json:"excerpt"`
	Content      string    `json:"content"`
	LikeCount    int       `json:"like_count"`
	ReviewStatus string    `json:"review_status"`
	AuthorName   string    `json:"author_name"`
	AuthorAvatar string    `json:"author_avatar"`
	AuthorHandle string    `json:"author_handle"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type cachedEssayListResult struct {
	Essays []CachedEssay `json:"essays"`
	Total  int64         `json:"total"`
}

func toCachedEssay(e *entity.Essay) CachedEssay {
	return CachedEssay{
		ID:           e.ID().String(),
		AuthorID:     e.AuthorID().String(),
		Title:        e.Title(),
		Excerpt:      e.Excerpt(),
		Content:      e.Content(),
		LikeCount:    e.LikeCount(),
		ReviewStatus: e.ReviewStatus(),
		AuthorName:   e.AuthorName(),
		AuthorAvatar: e.AuthorAvatar(),
		AuthorHandle: e.AuthorHandle(),
		CreatedAt:    e.CreatedAt(),
		UpdatedAt:    e.UpdatedAt(),
	}
}

func (ce CachedEssay) toEntity() *entity.Essay {
	id, _ := uuid.Parse(ce.ID)
	authorID, _ := uuid.Parse(ce.AuthorID)
	return entity.ReconstructEssay(
		id, authorID,
		ce.Title, ce.Excerpt, ce.Content, ce.LikeCount,
		ce.AuthorName, ce.AuthorAvatar, ce.AuthorHandle,
		ce.ReviewStatus,
		ce.CreatedAt, ce.UpdatedAt,
	)
}

// ---- 缓存 DTO → 实体重建 ----

func (cp CachedPost) toEntity() *entity.Post {
	id, _ := uuid.Parse(cp.ID)
	authorID, _ := uuid.Parse(cp.AuthorID)
	return entity.ReconstructPost(
		id, authorID,
		cp.Title, cp.Slug, cp.Excerpt, cp.Content, cp.Category,
		cp.Tags, cp.LikeCount, cp.ReadTime,
		cp.AuthorName, cp.AuthorAvatar, cp.AuthorHandle,
		cp.ReviewStatus,
		cp.CreatedAt, cp.UpdatedAt,
	)
}

func (cc CachedComment) toEntity() *entity.Comment {
	id, _ := uuid.Parse(cc.ID)
	postID, _ := uuid.Parse(cc.PostID)
	authorID, _ := uuid.Parse(cc.AuthorID)
	rs := cc.ReviewStatus
	if rs == "" {
		rs = "published"
	}
	return entity.ReconstructComment(
		id, postID, authorID,
		cc.Content, cc.AuthorName, cc.AuthorAvatar, rs,
		cc.CreatedAt,
	)
}
