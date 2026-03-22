package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"xoberon-server/internal/adapter/http/dto"
	"xoberon-server/internal/adapter/http/middleware"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
	"xoberon-server/pkg/pagination"
)

type PostHandler struct {
	db         *sqlx.DB
	listPosts  *query.ListPostsHandler
	getPost    *query.GetPostHandler
	createPost *command.CreatePostHandler
	updatePost *command.UpdatePostHandler
	deletePost *command.DeletePostHandler
	toggleLike *command.ToggleLikeHandler
	cache      repository.PostCachePort
}

func NewPostHandler(
	db *sqlx.DB,
	listPosts *query.ListPostsHandler,
	getPost *query.GetPostHandler,
	createPost *command.CreatePostHandler,
	updatePost *command.UpdatePostHandler,
	deletePost *command.DeletePostHandler,
	toggleLike *command.ToggleLikeHandler,
	cache repository.PostCachePort,
) *PostHandler {
	return &PostHandler{
		db:         db,
		listPosts:  listPosts,
		getPost:    getPost,
		createPost: createPost,
		updatePost: updatePost,
		deletePost: deletePost,
		toggleLike: toggleLike,
		cache:      cache,
	}
}

func (h *PostHandler) List(c *gin.Context) {
	p := parsePagination(c)

	posts, total, err := h.listPosts.Handle(c.Request.Context(), query.ListPostsQuery{
		Category: optionalQuery(c, "category"),
		Tag:      optionalQuery(c, "tag"),
		Keyword:  optionalQuery(c, "keyword"),
		Page:     p.Page,
		PageSize: p.Size,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	items := make([]dto.PostResp, 0, len(posts))
	for _, post := range posts {
		items = append(items, dto.ToPostListResp(post))
	}

	c.JSON(http.StatusOK, pagination.Result[dto.PostResp]{
		Items:    items,
		Total:    total,
		Page:     p.Page,
		PageSize: p.Size,
	})
}

func (h *PostHandler) GetBySlug(c *gin.Context) {
	slug := c.Param("id")

	result, err := h.getPost.Handle(c.Request.Context(), slug)
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.ToPostResp(result.Post, result.Comments))
}

func (h *PostHandler) Create(c *gin.Context) {
	var req dto.CreatePostReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: translateBindingError(err)})
		return
	}

	userID := middleware.GetUserID(c)
	post, err := h.createPost.Handle(c.Request.Context(), command.CreatePostCommand{
		AuthorID: userID,
		Title:    req.Title,
		Content:  req.Content,
		Category: req.Category,
		Tags:     req.Tags,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	// ?? DB ?? JOIN ????????
	result, err := h.getPost.Handle(c.Request.Context(), post.Slug())
	if err != nil {
		c.JSON(http.StatusCreated, dto.ToPostListResp(post))
		return
	}
	c.JSON(http.StatusCreated, dto.ToPostListResp(result.Post))
}

func (h *PostHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "????? ID"})
		return
	}

	var req dto.UpdatePostReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: translateBindingError(err)})
		return
	}

	userID := middleware.GetUserID(c)
	role, _ := valueobject.NewRole(middleware.GetUserRole(c))

	post, err := h.updatePost.Handle(c.Request.Context(), command.UpdatePostCommand{
		PostID:   id,
		EditorID: userID,
		Role:     role,
		Title:    req.Title,
		Content:  req.Content,
		Category: req.Category,
		Tags:     req.Tags,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.ToPostListResp(post))
}

func (h *PostHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "????? ID"})
		return
	}

	userID := middleware.GetUserID(c)
	role, _ := valueobject.NewRole(middleware.GetUserRole(c))

	if err := h.deletePost.Handle(c.Request.Context(), command.DeletePostCommand{
		PostID: id,
		UserID: userID,
		Role:   role,
	}); err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResp{Message: "????"})
}

func (h *PostHandler) Like(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "????? ID"})
		return
	}

	userID := middleware.GetUserID(c)
	result, err := h.toggleLike.Handle(c.Request.Context(), command.ToggleLikeCommand{
		UserID:     userID,
		TargetID:   id,
		TargetType: repository.TargetPost,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	_ = h.cache.InvalidateAll(c.Request.Context())

	c.JSON(http.StatusOK, dto.LikeResp{Liked: result.Liked, LikeCount: result.LikeCount})
}
