package moderation

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"xoberon-server/internal/domain/service"
	"xoberon-server/internal/infra/config"
)

var ErrRateLimited = errors.New("qwen: rate limited")

const moderationPrompt = `你是一个内容审核助手。请判断以下用户发布的内容是否合规。

审核维度：
1. 政治敏感：涉及国家领导人、政治体制批评、分裂言论
2. 色情低俗：露骨性描写、色情暗示
3. 暴力血腥：暴力行为描写、恐怖内容
4. 广告垃圾：商业推广、引流链接、垃圾信息
5. 人身攻击：辱骂、歧视、仇恨言论

判定规则：
- 明确合规、正常讨论、技术内容 → "approve"
- 明确违规（色情/暴力/垃圾广告/严重人身攻击等） → "reject"
- 擦边、有争议、无法确定是否违规 → "review"（交由人工审核）

请严格按以下 JSON 格式返回（不要返回其他内容）：
{"decision": "approve/review/reject", "reason": "判定原因", "labels": ["风险标签"]}

用户内容：
---
%s
---`

// QwenModerator 通义千问内容审核器，使用 DashScope OpenAI 兼容协议。
type QwenModerator struct {
	apiKey  string
	model   string
	baseURL string
	client  *http.Client
}

func NewQwenModerator(cfg config.QwenConfig) *QwenModerator {
	return &QwenModerator{
		apiKey:  cfg.APIKey,
		model:   cfg.Model,
		baseURL: cfg.BaseURL,
		client:  &http.Client{Timeout: 60 * time.Second},
	}
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type moderationJSON struct {
	Decision string   `json:"decision"`
	Reason   string   `json:"reason"`
	Labels   []string `json:"labels"`
}

func (m *QwenModerator) Check(ctx context.Context, text string) (*service.ModerationResult, error) {
	runes := []rune(text)
	if len(runes) > 2000 {
		runes = runes[:2000]
	}

	reqBody := chatRequest{
		Model: m.model,
		Messages: []chatMessage{
			{Role: "user", Content: fmt.Sprintf(moderationPrompt, string(runes))},
		},
		Temperature: 0.1,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		m.baseURL+"/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+m.apiKey)

	resp, err := m.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("通义千问请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("%w (HTTP 429)", ErrRateLimited)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("通义千问返回 %d: %s", resp.StatusCode, string(body))
	}

	var chatResp chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, fmt.Errorf("解析通义千问响应失败: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return nil, fmt.Errorf("通义千问返回空 choices")
	}

	content := chatResp.Choices[0].Message.Content
	var result moderationJSON
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return &service.ModerationResult{Decision: service.DecisionApprove}, nil
	}

	decision := result.Decision
	if decision != service.DecisionApprove && decision != service.DecisionReview && decision != service.DecisionReject {
		decision = service.DecisionApprove
	}

	return &service.ModerationResult{
		Decision: decision,
		Reason:   result.Reason,
		Labels:   result.Labels,
	}, nil
}
