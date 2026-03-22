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
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
)

func newUserTestDeps() (
	*mocks.MockUserRepository,
	*mocks.MockPostRepository,
	*mocks.MockEssayRepository,
	*handler.UserHandler,
) {
	userRepo := new(mocks.MockUserRepository)
	postRepo := new(mocks.MockPostRepository)
	essayRepo := new(mocks.MockEssayRepository)

	getProfile := query.NewGetUserProfileHandler(userRepo, postRepo, essayRepo)
	listUsers := query.NewListUsersHandler(userRepo)
	searchUsers := query.NewSearchUsersHandler(userRepo)
	updateRole := command.NewUpdateUserRoleHandler(userRepo)
	updateProfile := command.NewUpdateProfileHandler(userRepo)
	changePassword := command.NewChangePasswordHandler(userRepo)

	userHandler := handler.NewUserHandler(getProfile, listUsers, searchUsers, updateRole, updateProfile, changePassword)
	return userRepo, postRepo, essayRepo, userHandler
}

func TestUserGetProfile_Success(t *testing.T) {
	userRepo, postRepo, essayRepo, h := newUserTestDeps()

	now := time.Now()
	userID := uuid.New()
	user := entity.ReconstructUser(
		userID, "testuser", "test@example.com",
		"$2a$12$LJ3m4ys3Bz4IihWyXDw2xeqH7VlBsJEv8JsdO7YYu5FJdNJuGHpai",
		"X", "@testhandle", "", "", "user", now, now,
	)

	userRepo.On("FindByHandle", mock.Anything, "@testhandle").Return(user, nil)
	postRepo.On("List", mock.Anything, mock.Anything, 1, 1).Return([]*entity.Post(nil), int64(5), nil)
	essayRepo.On("List", mock.Anything, mock.Anything, 1, 1).Return([]*entity.Essay(nil), int64(3), nil)

	r := setupRouter()
	r.GET("/api/v1/users/:handle", h.GetProfile)

	w := performRequest(r, http.MethodGet, "/api/v1/users/testhandle", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "X", resp["name"])
	assert.Equal(t, "@testhandle", resp["handle"])
	assert.Equal(t, float64(5), resp["post_count"])
	assert.Equal(t, float64(3), resp["essay_count"])
}

func TestUserGetProfile_NotFound(t *testing.T) {
	userRepo, _, _, h := newUserTestDeps()

	userRepo.On("FindByHandle", mock.Anything, "@ghost").Return(nil, errs.NotFound("用户不存在"))

	r := setupRouter()
	r.GET("/api/v1/users/:handle", h.GetProfile)

	w := performRequest(r, http.MethodGet, "/api/v1/users/ghost", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUserSearch_Success(t *testing.T) {
	userRepo, _, _, h := newUserTestDeps()

	now := time.Now()
	user := entity.ReconstructUser(
		uuid.New(), "searchuser", "search@example.com",
		"$2a$12$LJ3m4ys3Bz4IihWyXDw2xeqH7VlBsJEv8JsdO7YYu5FJdNJuGHpai",
		"X", "@searchuser", "", "", "user", now, now,
	)

	userRepo.On("Search", mock.Anything, "keyword").Return([]*entity.User{user}, nil)

	userID := uuid.New()
	r := setupRouter()
	r.GET("/api/v1/users", authMiddleware(userID, "testuser", "user"), h.Search)

	w := performAuthRequest(r, http.MethodGet, "/api/v1/users?q=keyword", nil, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []map[string]interface{}
	parseJSON(w, &resp)
	assert.Len(t, resp, 1)
	assert.Equal(t, "X", resp[0]["name"])
}

func TestUserUpdateMe_Success(t *testing.T) {
	userRepo, _, _, h := newUserTestDeps()

	userID := uuid.New()
	now := time.Now()
	user := entity.ReconstructUser(
		userID, "testuser", "test@example.com",
		"$2a$12$LJ3m4ys3Bz4IihWyXDw2xeqH7VlBsJEv8JsdO7YYu5FJdNJuGHpai",
		"X", "@testuser", "", "", "user", now, now,
	)

	userRepo.On("FindByID", mock.Anything, userID).Return(user, nil)
	userRepo.On("Update", mock.Anything, mock.Anything).Return(nil)

	r := setupRouter()
	r.PUT("/api/v1/users/me", authMiddleware(userID, "testuser", "user"), h.UpdateMe)

	body := map[string]interface{}{
		"name":  "Updated Name",
		"bio":   "New bio",
		"avatar": "https://example.com/avatar.png",
	}
	w := performAuthRequest(r, http.MethodPut, "/api/v1/users/me", body, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "Updated Name", resp["name"])
}

func TestUserChangePassword_Success(t *testing.T) {
	userRepo, _, _, h := newUserTestDeps()

	user, _ := entity.NewUser("testuser", "test@example.com", "OldPass123!", "X")
	userID := user.ID()

	userRepo.On("FindByIDWithPassword", mock.Anything, userID).Return(user, nil)
	userRepo.On("UpdatePassword", mock.Anything, userID, mock.Anything).Return(nil)

	r := setupRouter()
	r.PUT("/api/v1/users/me/password", authMiddleware(userID, "testuser", "user"), h.ChangePassword)

	body := map[string]interface{}{
		"old_password": "OldPass123!",
		"new_password": "NewPass456!",
	}
	w := performAuthRequest(r, http.MethodPut, "/api/v1/users/me/password", body, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUserAdminListUsers_Success(t *testing.T) {
	userRepo, _, _, h := newUserTestDeps()

	now := time.Now()
	user := entity.ReconstructUser(
		uuid.New(), "adminuser", "admin@example.com",
		"$2a$12$LJ3m4ys3Bz4IihWyXDw2xeqH7VlBsJEv8JsdO7YYu5FJdNJuGHpai",
		"X", "@adminuser", "", "", "admin", now, now,
	)

	userRepo.On("ListWithCounts", mock.Anything, 1, 10).Return(
		[]repository.UserWithCounts{{User: user, PostCount: 5, EssayCount: 3}},
		int64(1),
		nil,
	)

	adminID := uuid.New()
	jwtMgr := newTestJWTManager()
	token := generateTestToken(jwtMgr, adminID, "admin", "admin")

	r := setupRouter()
	r.GET("/api/v1/admin/users", authMiddleware(adminID, "admin", "admin"), h.AdminListUsers)

	w := performAuthRequest(r, http.MethodGet, "/api/v1/admin/users", nil, token)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp struct {
		Items []map[string]interface{} `json:"items"`
		Total int64                     `json:"total"`
	}
	parseJSON(w, &resp)
	assert.Equal(t, int64(1), resp.Total)
	assert.Len(t, resp.Items, 1)
}

func TestUserAdminUpdateRole_Success(t *testing.T) {
	userRepo, _, _, h := newUserTestDeps()

	targetID := uuid.New()
	now := time.Now()
	user := entity.ReconstructUser(
		targetID, "targetuser", "target@example.com",
		"$2a$12$LJ3m4ys3Bz4IihWyXDw2xeqH7VlBsJEv8JsdO7YYu5FJdNJuGHpai",
		"X", "@targetuser", "", "", "user", now, now,
	)

	userRepo.On("FindByID", mock.Anything, targetID).Return(user, nil)
	userRepo.On("Update", mock.Anything, mock.Anything).Return(nil)

	adminID := uuid.New()
	jwtMgr := newTestJWTManager()
	token := generateTestToken(jwtMgr, adminID, "admin", "admin")

	r := setupRouter()
	r.PUT("/api/v1/admin/users/:id/role", authMiddleware(adminID, "admin", "admin"), h.AdminUpdateRole)

	body := map[string]interface{}{"role": "admin"}
	w := performAuthRequest(r, http.MethodPut, "/api/v1/admin/users/"+targetID.String()+"/role", body, token)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "admin", resp["role"])
}
