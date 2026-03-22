package dto

import (
	"time"

	"xoberon-server/internal/domain/entity"
)

// ---- Error ----

type ErrorResp struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

type MessageResp struct {
	Message string `json:"message"`
}

// ---- Auth ----

type CaptchaResp struct {
	CaptchaID string `json:"captcha_id"`
	Image     string `json:"image"`
}

type LoginResp struct {
	Token string   `json:"token"`
	User  UserResp `json:"user"`
}

// ---- User ----

type UserResp struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Handle string `json:"handle"`
	Bio    string `json:"bio"`
	Avatar string `json:"avatar"`
	Role   string `json:"role"`
}

type UserProfileResp struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Handle     string `json:"handle"`
	Bio        string `json:"bio"`
	Avatar     string `json:"avatar"`
	Role       string `json:"role"`
	PostCount  int64  `json:"post_count"`
	EssayCount int64  `json:"essay_count"`
}

// ---- Post ----

type PostResp struct {
	ID              string        `json:"id"`
	Title           string        `json:"title"`
	Slug            string        `json:"slug"`
	Excerpt         string        `json:"excerpt"`
	Content         string        `json:"content"`
	CreatedAt       time.Time     `json:"created_at"`
	Category        string        `json:"category"`
	Tags            []string      `json:"tags"`
	ReadTimeMinutes int           `json:"read_time_minutes"`
	LikeCount       int           `json:"like_count"`
	AuthorName      string        `json:"author_name"`
	AuthorAvatar    string        `json:"author_avatar"`
	AuthorHandle    string        `json:"author_handle"`
	Comments        []CommentResp `json:"comments"`
}

// ---- Essay ----

type EssayResp struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Excerpt      string    `json:"excerpt"`
	Content      string    `json:"content"`
	CreatedAt    time.Time `json:"created_at"`
	LikeCount    int       `json:"like_count"`
	AuthorName   string    `json:"author_name"`
	AuthorAvatar string    `json:"author_avatar"`
	AuthorHandle string    `json:"author_handle"`
}

// ---- Comment ----

type CommentResp struct {
	ID        string    `json:"id"`
	AuthorID  string    `json:"author_id"`
	Author    string    `json:"author"`
	Avatar    string    `json:"avatar"`
	CreatedAt time.Time `json:"created_at"`
	Content   string    `json:"content"`
}

// ---- Like ----

type LikeResp struct {
	Liked     bool `json:"liked"`
	LikeCount int  `json:"like_count"`
}

// ---- Admin ----

type ApiAdminUserDto struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Handle     string    `json:"handle"`
	Bio        string    `json:"bio"`
	Avatar     string    `json:"avatar"`
	Role       string    `json:"role"`
	Email      string    `json:"email"`
	PostCount  int64     `json:"post_count"`
	EssayCount int64     `json:"essay_count"`
	CreatedAt  time.Time `json:"created_at"`
}

// ---- Entity → Response 转换函数 ----

func ToUserResp(u *entity.User) UserResp {
	return UserResp{
		ID:     u.ID().String(),
		Name:   u.Name(),
		Handle: u.Handle(),
		Bio:    u.Bio(),
		Avatar: u.Avatar(),
		Role:   u.Role().String(),
	}
}

func ToAdminUserResp(u *entity.User, postCount, essayCount int64) ApiAdminUserDto {
	return ApiAdminUserDto{
		ID:         u.ID().String(),
		Name:       u.Name(),
		Handle:     u.Handle(),
		Bio:        u.Bio(),
		Avatar:     u.Avatar(),
		Role:       u.Role().String(),
		Email:      u.Email().String(),
		PostCount:  postCount,
		EssayCount: essayCount,
		CreatedAt:  u.CreatedAt(),
	}
}

func ToPostResp(p *entity.Post, comments []*entity.Comment) PostResp {
	tags := p.Tags()
	if tags == nil {
		tags = []string{}
	}

	cr := make([]CommentResp, 0, len(comments))
	for _, c := range comments {
		cr = append(cr, ToCommentResp(c))
	}

	return PostResp{
		ID:              p.ID().String(),
		Title:           p.Title(),
		Slug:            p.Slug(),
		Excerpt:         p.Excerpt(),
		Content:         p.Content(),
		CreatedAt:       p.CreatedAt(),
		Category:        p.Category(),
		Tags:            tags,
		ReadTimeMinutes: p.ReadTime(),
		LikeCount:       p.LikeCount(),
		AuthorName:      p.AuthorName(),
		AuthorAvatar:    p.AuthorAvatar(),
		AuthorHandle:    p.AuthorHandle(),
		Comments:        cr,
	}
}

func ToPostListResp(p *entity.Post) PostResp {
	tags := p.Tags()
	if tags == nil {
		tags = []string{}
	}
	return PostResp{
		ID:              p.ID().String(),
		Title:           p.Title(),
		Slug:            p.Slug(),
		Excerpt:         p.Excerpt(),
		Content:         p.Content(),
		CreatedAt:       p.CreatedAt(),
		Category:        p.Category(),
		Tags:            tags,
		ReadTimeMinutes: p.ReadTime(),
		LikeCount:       p.LikeCount(),
		AuthorName:      p.AuthorName(),
		AuthorAvatar:    p.AuthorAvatar(),
		AuthorHandle:    p.AuthorHandle(),
		Comments:        []CommentResp{},
	}
}

func ToEssayResp(e *entity.Essay) EssayResp {
	return EssayResp{
		ID:           e.ID().String(),
		Title:        e.Title(),
		Excerpt:      e.Excerpt(),
		Content:      e.Content(),
		CreatedAt:    e.CreatedAt(),
		LikeCount:    e.LikeCount(),
		AuthorName:   e.AuthorName(),
		AuthorAvatar: e.AuthorAvatar(),
		AuthorHandle: e.AuthorHandle(),
	}
}

func ToCommentResp(c *entity.Comment) CommentResp {
	return CommentResp{
		ID:        c.ID().String(),
		AuthorID:  c.AuthorID().String(),
		Author:    c.AuthorName(),
		Avatar:    c.AuthorAvatar(),
		CreatedAt: c.CreatedAt(),
		Content:   c.Content(),
	}
}
