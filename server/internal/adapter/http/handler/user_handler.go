package handler

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"xoberon-server/internal/adapter/http/dto"
	"xoberon-server/internal/adapter/http/middleware"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
	"xoberon-server/pkg/pagination"
)

type UserHandler struct {
	getProfile     *query.GetUserProfileHandler
	listUsers      *query.ListUsersHandler
	searchUsers    *query.SearchUsersHandler
	updateUserRole *command.UpdateUserRoleHandler
	updateProfile  *command.UpdateProfileHandler
	changePassword *command.ChangePasswordHandler
	likes          repository.LikeRepository
}

func NewUserHandler(
	getProfile *query.GetUserProfileHandler,
	listUsers *query.ListUsersHandler,
	searchUsers *query.SearchUsersHandler,
	updateUserRole *command.UpdateUserRoleHandler,
	updateProfile *command.UpdateProfileHandler,
	changePassword *command.ChangePasswordHandler,
	likes ...repository.LikeRepository,
) *UserHandler {
	var likeRepo repository.LikeRepository
	if len(likes) > 0 {
		likeRepo = likes[0]
	}
	return &UserHandler{
		getProfile:     getProfile,
		listUsers:      listUsers,
		searchUsers:    searchUsers,
		updateUserRole: updateUserRole,
		updateProfile:  updateProfile,
		changePassword: changePassword,
		likes:          likeRepo,
	}
}

func (h *UserHandler) GetMe(c *gin.Context) {
	result, err := h.getProfile.HandleByID(c.Request.Context(), middleware.GetUserID(c))
	if err != nil {
		mapError(c, err)
		return
	}
	u := result.User
	c.JSON(http.StatusOK, dto.CurrentUserResp{
		ID: u.ID().String(), Name: u.Name(), Handle: u.Handle(), Bio: u.Bio(), Avatar: u.Avatar(),
		Role: u.Role().String(), Email: u.Email().String(), PostCount: result.PostCount,
		EssayCount: result.EssayCount, CreatedAt: u.CreatedAt(),
	})
}

func (h *UserHandler) GetMyLikes(c *gin.Context) {
	if h.likes == nil {
		c.JSON(http.StatusServiceUnavailable, dto.ErrorResp{Error: "SERVICE_UNAVAILABLE", Message: "点赞服务暂时不可用"})
		return
	}
	ctx := c.Request.Context()
	userID := middleware.GetUserID(c)
	postIDs, err := h.likes.ListByUser(ctx, userID, repository.TargetPost)
	if err != nil {
		mapError(c, err)
		return
	}
	essayIDs, err := h.likes.ListByUser(ctx, userID, repository.TargetEssay)
	if err != nil {
		mapError(c, err)
		return
	}
	resp := dto.UserLikesResp{PostIDs: make([]string, len(postIDs)), EssayIDs: make([]string, len(essayIDs))}
	for i, id := range postIDs {
		resp.PostIDs[i] = id.String()
	}
	for i, id := range essayIDs {
		resp.EssayIDs[i] = id.String()
	}
	c.JSON(http.StatusOK, resp)
}

// GetProfile returns a user's public profile.
func (h *UserHandler) GetProfile(c *gin.Context) {
	handle := c.Param("handle")
	if handle != "" && handle[0] != '@' {
		handle = "@" + handle
	}

	result, err := h.getProfile.Handle(c.Request.Context(), handle)
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.UserProfileResp{
		ID:         result.User.ID().String(),
		Name:       result.User.Name(),
		Handle:     result.User.Handle(),
		Bio:        result.User.Bio(),
		Avatar:     result.User.Avatar(),
		Role:       result.User.Role().String(),
		PostCount:  result.PostCount,
		EssayCount: result.EssayCount,
	})
}

// Search returns users matching the query string.
func (h *UserHandler) Search(c *gin.Context) {
	q := c.Query("q")
	users, err := h.searchUsers.Handle(c.Request.Context(), q)
	if err != nil {
		mapError(c, err)
		return
	}

	items := make([]dto.UserResp, 0, len(users))
	for _, u := range users {
		items = append(items, dto.ToUserResp(u))
	}
	c.JSON(http.StatusOK, items)
}

func (h *UserHandler) UpdateMe(c *gin.Context) {
	var req dto.UpdateProfileReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: translateBindingError(err)})
		return
	}
	if req.Avatar != "" {
		parsed, err := url.Parse(req.Avatar)
		if err != nil || !strings.EqualFold(parsed.Scheme, "https") || parsed.Host == "" {
			c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "头像地址必须是有效的 HTTPS URL"})
			return
		}
	}

	userID := middleware.GetUserID(c)
	user, err := h.updateProfile.Handle(c.Request.Context(), command.UpdateProfileCommand{
		UserID: userID,
		Name:   req.Name,
		Bio:    req.Bio,
		Avatar: req.Avatar,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.ToUserResp(user))
}

// ChangePassword updates the current user's password.
func (h *UserHandler) ChangePassword(c *gin.Context) {
	var req dto.ChangePasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: translateBindingError(err)})
		return
	}

	userID := middleware.GetUserID(c)
	err := h.changePassword.Handle(c.Request.Context(), command.ChangePasswordCommand{
		UserID:      userID,
		OldPassword: req.OldPassword,
		NewPassword: req.NewPassword,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "密码已更新"})
}

// AdminListUsers returns users and counts for the admin console.
func (h *UserHandler) AdminListUsers(c *gin.Context) {
	p := parsePagination(c)

	usersWithCounts, total, err := h.listUsers.HandleWithCounts(c.Request.Context(), query.ListUsersQuery{
		Page:     p.Page,
		PageSize: p.Size,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	items := make([]dto.ApiAdminUserDto, 0, len(usersWithCounts))
	for _, uc := range usersWithCounts {
		items = append(items, dto.ToAdminUserResp(uc.User, uc.PostCount, uc.EssayCount))
	}

	c.JSON(http.StatusOK, pagination.Result[dto.ApiAdminUserDto]{
		Items:    items,
		Total:    total,
		Page:     p.Page,
		PageSize: p.Size,
	})
}

// AdminUpdateRole updates a user's role from the admin console.
func (h *UserHandler) AdminUpdateRole(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "无效的用户 ID"})
		return
	}

	var req dto.UpdateRoleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: translateBindingError(err)})
		return
	}

	user, err := h.updateUserRole.Handle(c.Request.Context(), command.UpdateUserRoleCommand{
		TargetUserID: targetID,
		NewRole:      req.Role,
		ActorRole:    middleware.GetUserRole(c),
	})
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.ToUserResp(user))
}
