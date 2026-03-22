-- posts 表添加审核状态字段
-- 作者: X
-- 日期: 2026-03-01

ALTER TABLE posts
    ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'published'
        CHECK (review_status IN ('published', 'flagged', 'hidden'));

CREATE INDEX idx_posts_review_status ON posts(review_status);
