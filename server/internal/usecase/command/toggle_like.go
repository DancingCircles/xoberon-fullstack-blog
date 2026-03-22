package command

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/repository"
)

type ToggleLikeCommand struct {
	UserID     uuid.UUID
	TargetID   uuid.UUID
	TargetType repository.TargetType
}

type ToggleLikeResult struct {
	Liked     bool
	LikeCount int
}

type ToggleLikeHandler struct {
	likes repository.LikeRepository
}

func NewToggleLikeHandler(likes repository.LikeRepository) *ToggleLikeHandler {
	return &ToggleLikeHandler{likes: likes}
}

func (h *ToggleLikeHandler) Handle(ctx context.Context, cmd ToggleLikeCommand) (*ToggleLikeResult, error) {
	liked, likeCount, err := h.likes.Toggle(ctx, cmd.UserID, cmd.TargetID, cmd.TargetType)
	if err != nil {
		return nil, err
	}
	return &ToggleLikeResult{Liked: liked, LikeCount: likeCount}, nil
}
