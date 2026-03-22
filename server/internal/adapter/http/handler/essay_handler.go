package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"xoberon-server/internal/adapter/http/dto"
	"xoberon-server/internal/adapter/http/middleware"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
	"xoberon-server/pkg/pagination"
)

type EssayHandler struct {
	listEssays  *query.ListEssaysHandler
	getEssay    *query.GetEssayHandler
	createEssay *command.CreateEssayHandler
	updateEssay *command.UpdateEssayHandler
	deleteEssay *command.DeleteEssayHandler
	toggleLike  *command.ToggleLikeHandler
	cache       repository.EssayCachePort
}

func NewEssayHandler(
	listEssays *query.ListEssaysHandler,
	getEssay *query.GetEssayHandler,
	createEssay *command.CreateEssayHandler,
	updateEssay *command.UpdateEssayHandler,
	deleteEssay *command.DeleteEssayHandler,
	toggleLike *command.ToggleLikeHandler,
	cache repository.EssayCachePort,
) *EssayHandler {
	return &EssayHandler{
		listEssays:  listEssays,
		getEssay:    getEssay,
		createEssay: createEssay,
		updateEssay: updateEssay,
		deleteEssay: deleteEssay,
		toggleLike:  toggleLike,
		cache:       cache,
	}
}

func (h *EssayHandler) List(c *gin.Context) {
	p := parsePagination(c)

	essays, total, err := h.listEssays.Handle(c.Request.Context(), query.ListEssaysQuery{
		Keyword:  optionalQuery(c, "keyword"),
		Page:     p.Page,
		PageSize: p.Size,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	items := make([]dto.EssayResp, 0, len(essays))
	for _, e := range essays {
		items = append(items, dto.ToEssayResp(e))
	}

	c.JSON(http.StatusOK, pagination.Result[dto.EssayResp]{
		Items:    items,
		Total:    total,
		Page:     p.Page,
		PageSize: p.Size,
	})
}

func (h *EssayHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "????? ID"})
		return
	}

	essay, err := h.getEssay.Handle(c.Request.Context(), id)
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.ToEssayResp(essay))
}

func (h *EssayHandler) Create(c *gin.Context) {
	var req dto.CreateEssayReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: translateBindingError(err)})
		return
	}

	userID := middleware.GetUserID(c)
	essay, err := h.createEssay.Handle(c.Request.Context(), command.CreateEssayCommand{
		AuthorID: userID,
		Title:    req.Title,
		Excerpt:  req.Excerpt,
		Content:  req.Content,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.ToEssayResp(essay))
}

func (h *EssayHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "????? ID"})
		return
	}

	var req dto.UpdateEssayReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: translateBindingError(err)})
		return
	}

	userID := middleware.GetUserID(c)
	roleStr := middleware.GetUserRole(c)
	role, _ := valueobject.NewRole(roleStr)

	essay, err := h.updateEssay.Handle(c.Request.Context(), command.UpdateEssayCommand{
		EssayID:    id,
		EditorID:   userID,
		EditorRole: role,
		Title:      req.Title,
		Excerpt:    req.Excerpt,
		Content:    req.Content,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.ToEssayResp(essay))
}

func (h *EssayHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "????? ID"})
		return
	}

	userID := middleware.GetUserID(c)
	roleStr := middleware.GetUserRole(c)
	role, _ := valueobject.NewRole(roleStr)

	if err := h.deleteEssay.Handle(c.Request.Context(), command.DeleteEssayCommand{
		EssayID:       id,
		RequesterID:   userID,
		RequesterRole: role,
	}); err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResp{Message: "????"})
}

func (h *EssayHandler) Like(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "????? ID"})
		return
	}

	userID := middleware.GetUserID(c)
	result, err := h.toggleLike.Handle(c.Request.Context(), command.ToggleLikeCommand{
		UserID:     userID,
		TargetID:   id,
		TargetType: repository.TargetEssay,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	_ = h.cache.InvalidateEssay(c.Request.Context(), id.String())

	c.JSON(http.StatusOK, dto.LikeResp{Liked: result.Liked, LikeCount: result.LikeCount})
}
