package command

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/domain/service"
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/pkg/logger"
)

type UpdateEssayCommand struct {
	EssayID  uuid.UUID
	EditorID uuid.UUID
	// EditorRole 用于判断是否为管理员（管理员可编辑他人随笔）
	EditorRole valueobject.Role
	Title      string
	Excerpt    string
	Content    string
}

type UpdateEssayHandler struct {
	essays    repository.EssayRepository
	cache     repository.EssayCachePort
	moderator service.ContentModerator
}

func NewUpdateEssayHandler(essays repository.EssayRepository, cache repository.EssayCachePort, moderator service.ContentModerator) *UpdateEssayHandler {
	return &UpdateEssayHandler{essays: essays, cache: cache, moderator: moderator}
}

func (h *UpdateEssayHandler) Handle(ctx context.Context, cmd UpdateEssayCommand) (*entity.Essay, error) {
	result, err := h.moderator.Check(ctx, cmd.Title+" "+cmd.Content)
	if err != nil {
		return nil, fmt.Errorf("内容审核服务异常: %w", err)
	}
	if result.IsReject() {
		return nil, errs.Validationf("内容不合规: %s", result.Reason)
	}

	essay, err := h.essays.FindByID(ctx, cmd.EssayID)
	if err != nil {
		return nil, err
	}

	if err := essay.Edit(cmd.EditorID, cmd.EditorRole, cmd.Title, cmd.Excerpt, cmd.Content); err != nil {
		return nil, err
	}

	if err := h.essays.Update(ctx, essay); err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "更新随笔失败", err)
	}

	if err := h.cache.InvalidateEssay(ctx, essay.ID().String()); err != nil {
		logger.L().Warn("cache_invalidate_failed", zap.String("op", "update_essay"), zap.Error(err))
	}

	return essay, nil
}
