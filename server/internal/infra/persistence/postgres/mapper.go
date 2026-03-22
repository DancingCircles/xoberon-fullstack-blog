package postgres

import (
	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
)

// ---- Row → Entity 映射 ----

func (r *userRow) toEntity() *entity.User {
	return entity.ReconstructUser(
		r.ID, r.Username, r.Email, r.Password,
		r.Name, r.Handle, r.Avatar, r.Bio, r.Role,
		r.CreatedAt, r.UpdatedAt,
	)
}

func (r *adminUserRow) toWithCounts() repository.UserWithCounts {
	user := entity.ReconstructUser(
		r.ID, r.Username, r.Email, "",
		r.Name, r.Handle, r.Avatar, r.Bio, r.Role,
		r.CreatedAt, r.UpdatedAt,
	)
	return repository.UserWithCounts{
		User:       user,
		PostCount:  r.PostCount,
		EssayCount: r.EssayCount,
	}
}

func (r *postRow) toEntity() *entity.Post {
	return entity.ReconstructPost(
		r.ID, r.AuthorID,
		r.Title, r.Slug, r.Excerpt, r.Content, r.Category,
		[]string(r.Tags), r.LikeCount, r.ReadTimeMinutes,
		r.AuthorName, r.AuthorAvatar, r.AuthorHandle,
		r.ReviewStatus,
		r.CreatedAt, r.UpdatedAt,
	)
}

func (r *essayRow) toEntity() *entity.Essay {
	return entity.ReconstructEssay(
		r.ID, r.AuthorID,
		r.Title, r.Excerpt, r.Content,
		r.LikeCount,
		r.AuthorName, r.AuthorAvatar, r.AuthorHandle, r.ReviewStatus,
		r.CreatedAt, r.UpdatedAt,
	)
}

func (r *commentRow) toEntity() *entity.Comment {
	return entity.ReconstructComment(
		r.ID, r.PostID, r.AuthorID,
		r.Content, r.AuthorName, r.AuthorAvatar, r.ReviewStatus,
		r.CreatedAt,
	)
}

func (r *contactRow) toEntity() *entity.Contact {
	return entity.ReconstructContact(
		r.ID, r.Name, r.Email, r.Message, r.IsRead, r.CreatedAt,
	)
}
