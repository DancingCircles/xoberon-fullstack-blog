package handler_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"xoberon-server/internal/adapter/http/handler"
)

func TestHeartbeat_NoRedis(t *testing.T) {
	h := handler.NewHeartbeatHandler(nil)

	userID := uuid.New()
	r := setupRouter()
	r.POST("/heartbeat", authMiddleware(userID, "testuser", "user"), h.Heartbeat)

	w := performRequest(r, http.MethodPost, "/heartbeat", nil)

	assert.Equal(t, http.StatusNoContent, w.Code)
}

func TestOnlineCount_NoRedis(t *testing.T) {
	h := handler.NewHeartbeatHandler(nil)

	userID := uuid.New()
	r := setupRouter()
	r.GET("/online-count", authMiddleware(userID, "admin", "admin"), h.OnlineCount)

	w := performRequest(r, http.MethodGet, "/online-count", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, float64(0), resp["count"])
}
