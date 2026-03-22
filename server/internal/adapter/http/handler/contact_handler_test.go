package handler_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/adapter/http/handler"
	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
)

func newContactTestDeps() (
	*mocks.MockContactRepository,
	*handler.ContactHandler,
) {
	contactRepo := new(mocks.MockContactRepository)

	submitContact := command.NewSubmitContactHandler(contactRepo)
	listContacts := query.NewListContactsHandler(contactRepo)
	markContactRead := command.NewMarkContactReadHandler(contactRepo)

	contactHandler := handler.NewContactHandler(submitContact, listContacts, markContactRead)
	return contactRepo, contactHandler
}

func TestContactSubmit_Success(t *testing.T) {
	contactRepo, h := newContactTestDeps()

	contactRepo.On("Save", mock.Anything, mock.Anything).Return(nil)

	r := setupRouter()
	r.POST("/api/v1/contact", h.Submit)

	body := map[string]interface{}{
		"name":    "X",
		"email":   "x@example.com",
		"message": "Hello, this is a test message.",
	}
	w := performRequest(r, http.MethodPost, "/api/v1/contact", body)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.NotEmpty(t, resp["message"])
	contactRepo.AssertExpectations(t)
}

func TestContactSubmit_MissingFields(t *testing.T) {
	_, h := newContactTestDeps()

	r := setupRouter()
	r.POST("/api/v1/contact", h.Submit)

	body := map[string]interface{}{"name": "X"}
	w := performRequest(r, http.MethodPost, "/api/v1/contact", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "VALIDATION_ERROR", resp["error"])
}

func TestContactSubmit_Honeypot(t *testing.T) {
	contactRepo, h := newContactTestDeps()

	r := setupRouter()
	r.POST("/api/v1/contact", h.Submit)

	body := map[string]interface{}{
		"name":    "X",
		"email":   "x@example.com",
		"message": "Hello",
		"website": "spam",
	}
	w := performRequest(r, http.MethodPost, "/api/v1/contact", body)

	assert.Equal(t, http.StatusCreated, w.Code)
	contactRepo.AssertNotCalled(t, "Save", mock.Anything, mock.Anything)
}

func TestContactList_Success(t *testing.T) {
	contactRepo, h := newContactTestDeps()

	now := time.Now()
	contact := entity.ReconstructContact(
		uuid.New(), "X", "x@example.com", "Message", false, now,
	)
	contactRepo.On("List", mock.Anything, 1, 10).Return([]*entity.Contact{contact}, int64(1), nil)

	r := setupRouter()
	r.GET("/api/v1/admin/contacts", authMiddleware(uuid.New(), "admin", "admin"), h.List)

	w := performAuthRequest(r, http.MethodGet, "/api/v1/admin/contacts", nil, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
	var resp struct {
		Items    []interface{} `json:"items"`
		Total    int64         `json:"total"`
		Page     int           `json:"page"`
		PageSize int           `json:"page_size"`
	}
	parseJSON(w, &resp)
	assert.Equal(t, int64(1), resp.Total)
	assert.Len(t, resp.Items, 1)
}

func TestContactMarkRead_Success(t *testing.T) {
	contactRepo, h := newContactTestDeps()

	contactID := uuid.New()
	contactRepo.On("MarkRead", mock.Anything, contactID).Return(nil)

	r := setupRouter()
	r.PUT("/api/v1/admin/contacts/:id/read", authMiddleware(uuid.New(), "admin", "admin"), h.MarkRead)

	w := performAuthRequest(r, http.MethodPut, "/api/v1/admin/contacts/"+contactID.String()+"/read", nil, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.NotEmpty(t, resp["message"])
}
