-- 拆分多态 likes 表为 post_likes + essay_likes
-- 消除 target_type 判别列，使用外键约束保证引用完整性
-- 作者: X
-- 日期: 2026-02-28

BEGIN;

CREATE TABLE IF NOT EXISTS post_likes (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_post_likes_post ON post_likes(post_id);

CREATE TABLE IF NOT EXISTS essay_likes (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    essay_id   UUID        NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, essay_id)
);

CREATE INDEX idx_essay_likes_essay ON essay_likes(essay_id);

-- 迁移现有数据
INSERT INTO post_likes (user_id, post_id, created_at)
SELECT user_id, target_id, created_at FROM likes WHERE target_type = 'post'
ON CONFLICT DO NOTHING;

INSERT INTO essay_likes (user_id, essay_id, created_at)
SELECT user_id, target_id, created_at FROM likes WHERE target_type = 'essay'
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS likes;

COMMIT;
