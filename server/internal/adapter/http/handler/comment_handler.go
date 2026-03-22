package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"xoberon-server/internal/adapter/http/dto"
	"xoberon-server/internal/adapter/http/middleware"
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
)

type CommentHandler struct {
	listByPost    *query.ListCommentsByPostHandler
	createComment *command.CreateCommentHandler
	deleteComment *command.DeleteCommentHandler
}

func NewCommentHandler(
	listByPost *query.ListCommentsByPostHandler,
	createComment *command.CreateCommentHandler,
	deleteComment *command.DeleteCommentHandler,
) *CommentHandler {
	return &CommentHandler{listByPost: listByPost, createComment: createComment, deleteComment: deleteComment}
}

func (h *CommentHandler) ListByPost(c *gin.Context) {
	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "æ— æ•ˆçš„æ–‡ç«  ID"})
		return
	}

	p := parsePagination(c)
	comments, err := h.listByPost.Handle(c.Request.Context(), query.ListCommentsByPostQuery{
		PostID:   postID,
		Page:     p.Page,
		PageSize: p.Size,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	items := make([]dto.CommentResp, 0, len(comments))
	for _, cm := range comments {
		items = append(items, dto.ToCommentResp(cm))
	}

	c.JSON(http.StatusOK, items)
}

func (h *CommentHandler) Create(c *gin.Context) {
	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "æ— æ•ˆçš„æ–‡ç«  ID"})
		return
	}

	var req dto.CreateCommentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: translateBindingError(err)})
		return
	}

	userID := middleware.GetUserID(c)
	comment, err := h.createComment.Handle(c.Request.Context(), command.CreateCommentCommand{
		PostID:   postID,
		AuthorID: userID,
		Content:  req.Content,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.ToCommentResp(comment))
}

func (h *CommentHandler) Delete(c *gin.Context) {
	commentID, err := uuid.Parse(c.Param("commentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "无效的评论 ID"})
		return
	}

	userID := middleware.GetUserID(c)
	role, _ := valueobject.NewRole(middleware.GetUserRole(c))

	if err := h.deleteComment.Handle(c.Request.Context(), command.DeleteCommentCommand{
		CommentID: commentID,
		UserID:    userID,
		Role:      role,
	}); err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResp{Message: "评论已删除"})
}
