package recommendation

import (
	"context"
	"math"
	"sort"
	"time"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/domain/service"
)

// HackerNews-style gravity，值越大旧帖衰减越快
const gravity = 1.5

// ScoreRecommender 本地推荐算法，零外部依赖。
// 融合 HackerNews 热度排名、用户标签偏好、浏览去重三个信号。
type ScoreRecommender struct {
	posts repository.PostRepository
	views repository.ViewRepository
	likes repository.LikeRepository
}

func NewScoreRecommender(
	posts repository.PostRepository,
	views repository.ViewRepository,
	likes repository.LikeRepository,
) *ScoreRecommender {
	return &ScoreRecommender{posts: posts, views: views, likes: likes}
}

func (r *ScoreRecommender) Recommend(ctx context.Context, req service.RecommendRequest) ([]*entity.Post, error) {
	if req.Limit <= 0 {
		req.Limit = 5
	}

	candidates, err := r.posts.ListForRecommendation(ctx, req.ExcludePostIDs, req.Limit*10)
	if err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		return []*entity.Post{}, nil
	}

	userTags := map[string]bool{}
	viewedSet := map[uuid.UUID]bool{}
	if req.UserID != nil {
		userTags = r.collectUserTags(ctx, *req.UserID, candidates)
		viewedSet = r.collectViewed(ctx, *req.UserID)
	}

	type scored struct {
		post  *entity.Post
		score float64
	}

	now := time.Now()
	scoredPosts := make([]scored, 0, len(candidates))

	for _, p := range candidates {
		hot := hotScore(p.LikeCount(), p.CreatedAt(), now)
		tagBoost := tagBoostScore(p.Tags(), userTags)

		total := hot + tagBoost

		if viewedSet[p.ID()] {
			total *= 0.3
		}

		scoredPosts = append(scoredPosts, scored{post: p, score: total})
	}

	sort.Slice(scoredPosts, func(i, j int) bool {
		return scoredPosts[i].score > scoredPosts[j].score
	})

	limit := req.Limit
	if limit > len(scoredPosts) {
		limit = len(scoredPosts)
	}

	result := make([]*entity.Post, limit)
	for i := 0; i < limit; i++ {
		result[i] = scoredPosts[i].post
	}
	return result, nil
}

func (r *ScoreRecommender) collectUserTags(ctx context.Context, userID uuid.UUID, candidates []*entity.Post) map[string]bool {
	tags := map[string]bool{}
	likedIDs, err := r.likes.ListByUser(ctx, userID, repository.TargetPost)
	if err != nil {
		return tags
	}

	likedSet := make(map[uuid.UUID]bool, len(likedIDs))
	for _, id := range likedIDs {
		likedSet[id] = true
	}

	for _, p := range candidates {
		if likedSet[p.ID()] {
			for _, t := range p.Tags() {
				tags[t] = true
			}
		}
	}
	return tags
}

func (r *ScoreRecommender) collectViewed(ctx context.Context, userID uuid.UUID) map[uuid.UUID]bool {
	ids, err := r.views.ListRecentPostIDs(ctx, userID, 50)
	if err != nil {
		return nil
	}
	set := make(map[uuid.UUID]bool, len(ids))
	for _, id := range ids {
		set[id] = true
	}
	return set
}

// hotScore HackerNews 风格热度排名。
// score = log2(max(likes, 1)) / (hours_age + 2)^gravity
// 新帖自带高分，随时间衰减；点赞越多衰减越慢。
func hotScore(likeCount int, createdAt, now time.Time) float64 {
	votes := math.Max(float64(likeCount), 1)
	hoursAge := now.Sub(createdAt).Hours()
	if hoursAge < 0 {
		hoursAge = 0
	}
	return math.Log2(votes+1) / math.Pow(hoursAge+2, gravity)
}

// tagBoostScore 标签匹配加分，命中用户偏好标签越多加分越高（上限 0.5）。
func tagBoostScore(postTags []string, userTags map[string]bool) float64 {
	if len(userTags) == 0 || len(postTags) == 0 {
		return 0
	}
	matched := 0
	for _, t := range postTags {
		if userTags[t] {
			matched++
		}
	}
	ratio := float64(matched) / float64(len(postTags))
	return ratio * 0.5
}
