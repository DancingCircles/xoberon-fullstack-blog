-- 回滚：恢复多态 likes 表
-- 作者: X
-- 日期: 2026-02-28

BEGIN;

CREATE TABLE IF NOT EXISTS likes (
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id   UUID         NOT NULL,
    target_type VARCHAR(10)  NOT NULL CHECK (target_type IN ('post', 'essay')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, target_id, target_type)
);

CREATE INDEX idx_likes_target ON likes(target_id, target_type);

INSERT INTO likes (user_id, target_id, target_type, created_at)
SELECT user_id, post_id, 'post', created_at FROM post_likes
ON CONFLICT DO NOTHING;

INSERT INTO likes (user_id, target_id, target_type, created_at)
SELECT user_id, essay_id, 'essay', created_at FROM essay_likes
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS essay_likes;

COMMIT;
