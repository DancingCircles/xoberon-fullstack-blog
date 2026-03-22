package command

import (
	"context"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/pkg/logger"
)

type DeleteEssayCommand struct {
	EssayID     uuid.UUID
	RequesterID uuid.UUID
	// RequesterRole 用于判断管理员是否可强制删除
	RequesterRole valueobject.Role
}

type DeleteEssayHandler struct {
	essays repository.EssayRepository
	cache  repository.EssayCachePort
}

func NewDeleteEssayHandler(essays repository.EssayRepository, cache repository.EssayCachePort) *DeleteEssayHandler {
	return &DeleteEssayHandler{essays: essays, cache: cache}
}

func (h *DeleteEssayHandler) Handle(ctx context.Context, cmd DeleteEssayCommand) error {
	essay, err := h.essays.FindByID(ctx, cmd.EssayID)
	if err != nil {
		return err
	}

	if !essay.CanDelete(cmd.RequesterID, cmd.RequesterRole) {
		return errs.Forbidden("只有作者或管理员可以删除随笔")
	}

	if err := h.essays.Delete(ctx, cmd.EssayID); err != nil {
		return err
	}

	if err := h.cache.InvalidateEssay(ctx, essay.ID().String()); err != nil {
		logger.L().Warn("cache_invalidate_failed", zap.String("op", "delete_essay"), zap.Error(err))
	}

	return nil
}
