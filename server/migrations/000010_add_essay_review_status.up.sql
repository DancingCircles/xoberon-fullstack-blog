-- essays 表添加审核状态字段（与 posts 审核流程对齐）
-- 作者: X
-- 日期: 2026-03-02

ALTER TABLE essays
    ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'published'
        CHECK (review_status IN ('published', 'flagged', 'hidden'));

CREATE INDEX idx_essays_review_status ON essays(review_status);
