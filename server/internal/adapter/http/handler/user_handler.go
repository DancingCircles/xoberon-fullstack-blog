package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"xoberon-server/internal/adapter/http/dto"
	"xoberon-server/internal/adapter/http/middleware"
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
}

func NewUserHandler(
	getProfile *query.GetUserProfileHandler,
	listUsers *query.ListUsersHandler,
	searchUsers *query.SearchUsersHandler,
	updateUserRole *command.UpdateUserRoleHandler,
	updateProfile *command.UpdateProfileHandler,
	changePassword *command.ChangePasswordHandler,
) *UserHandler {
	return &UserHandler{
		getProfile:     getProfile,
		listUsers:      listUsers,
		searchUsers:    searchUsers,
		updateUserRole: updateUserRole,
		updateProfile:  updateProfile,
		changePassword: changePassword,
	}
}

// GetProfile ??????
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

// Search ??????
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

// ChangePassword ????????
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

	c.JSON(http.StatusOK, gin.H{"message": "?????"})
}

// AdminListUsers ????????????????/?????
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

// AdminUpdateRole ????????????
func (h *UserHandler) AdminUpdateRole(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "????? ID"})
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
	})
	if err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.ToUserResp(user))
}
