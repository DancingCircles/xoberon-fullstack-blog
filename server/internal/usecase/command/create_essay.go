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
	"xoberon-server/pkg/logger"
)

type CreateEssayCommand struct {
	AuthorID uuid.UUID
	Title    string
	Excerpt  string
	Content  string
}

type CreateEssayHandler struct {
	essays    repository.EssayRepository
	cache     repository.EssayCachePort
	moderator service.ContentModerator
}

func NewCreateEssayHandler(essays repository.EssayRepository, cache repository.EssayCachePort, moderator service.ContentModerator) *CreateEssayHandler {
	return &CreateEssayHandler{essays: essays, cache: cache, moderator: moderator}
}

func (h *CreateEssayHandler) Handle(ctx context.Context, cmd CreateEssayCommand) (*entity.Essay, error) {
	result, err := h.moderator.Check(ctx, cmd.Title+" "+cmd.Content)
	if err != nil {
		return nil, fmt.Errorf("内容审核服务异常: %w", err)
	}
	if result.IsReject() {
		return nil, errs.Validationf("内容不合规: %s", result.Reason)
	}

	essay, err := entity.NewEssay(cmd.AuthorID, cmd.Title, cmd.Excerpt, cmd.Content)
	if err != nil {
		return nil, err
	}

	if err := h.essays.Save(ctx, essay); err != nil {
		return nil, err
	}

	if err := h.cache.InvalidateAll(ctx); err != nil {
		logger.L().Warn("cache_invalidate_failed", zap.String("op", "create_essay"), zap.Error(err))
	}

	full, err := h.essays.FindByID(ctx, essay.ID())
	if err != nil {
		logger.L().Warn("refetch_after_create_failed", zap.String("essay_id", essay.ID().String()), zap.Error(err))
		return essay, nil
	}
	return full, nil
}
