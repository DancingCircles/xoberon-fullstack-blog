package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"xoberon-server/internal/adapter/http/dto"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
	"xoberon-server/pkg/pagination"
)

type ContactHandler struct {
	submitContact    *command.SubmitContactHandler
	listContacts     *query.ListContactsHandler
	markContactRead  *command.MarkContactReadHandler
}

func NewContactHandler(
	submitContact *command.SubmitContactHandler,
	listContacts *query.ListContactsHandler,
	markContactRead *command.MarkContactReadHandler,
) *ContactHandler {
	return &ContactHandler{
		submitContact:   submitContact,
		listContacts:    listContacts,
		markContactRead: markContactRead,
	}
}

func (h *ContactHandler) Submit(c *gin.Context) {
	var req dto.ContactReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: translateBindingError(err)})
		return
	}

	if req.Honeypot != "" {
		c.JSON(http.StatusCreated, dto.MessageResp{Message: "ćśćŻĺˇ˛ĺé"})
		return
	}

	if err := h.submitContact.Handle(c.Request.Context(), command.SubmitContactCommand{
		Name:    req.Name,
		Email:   req.Email,
		Message: req.Message,
	}); err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.MessageResp{Message: "ćśćŻĺˇ˛ĺé"})
}

// ---- Admin ----

func (h *ContactHandler) List(c *gin.Context) {
	p := parsePagination(c)

	contacts, total, err := h.listContacts.Handle(c.Request.Context(), query.ListContactsQuery{
		Page:     p.Page,
		PageSize: p.Size,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	type contactItem struct {
		ID        string `json:"id"`
		Name      string `json:"name"`
		Email     string `json:"email"`
		Message   string `json:"message"`
		IsRead    bool   `json:"is_read"`
		CreatedAt string `json:"created_at"`
	}

	items := make([]contactItem, 0, len(contacts))
	for _, ct := range contacts {
		items = append(items, contactItem{
			ID:        ct.ID().String(),
			Name:      ct.Name(),
			Email:     ct.Email().String(),
			Message:   ct.Message(),
			IsRead:    ct.IsRead(),
			CreatedAt: ct.CreatedAt().Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	c.JSON(http.StatusOK, pagination.Result[contactItem]{
		Items:    items,
		Total:    total,
		Page:     p.Page,
		PageSize: p.Size,
	})
}

func (h *ContactHandler) MarkRead(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "ć ćçćśćŻ ID"})
		return
	}

	if err := h.markContactRead.Handle(c.Request.Context(), command.MarkContactReadCommand{
		ContactID: id,
	}); err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResp{Message: "ĺˇ˛ć čŽ°ä¸şĺˇ˛čŻť"})
}
