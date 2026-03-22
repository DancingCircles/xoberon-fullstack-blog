-- 添加审核表 + owner 角色支持
-- 作者: X
-- 日期: 2026-03-01

-- ==========================================
-- 审核表
-- ==========================================
CREATE TABLE IF NOT EXISTS reviews (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type  VARCHAR(20)  NOT NULL CHECK (content_type IN ('post', 'essay', 'comment')),
    content_id    UUID         NOT NULL,
    title         TEXT         NOT NULL DEFAULT '',
    excerpt       TEXT         NOT NULL DEFAULT '',
    author_name   TEXT         NOT NULL DEFAULT '',
    author_avatar TEXT         NOT NULL DEFAULT '',
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reject_reason TEXT         DEFAULT '',
    ai_confidence REAL         DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_content ON reviews(content_type, content_id);

-- ==========================================
-- 扩展 users.role 约束以支持 owner
-- ==========================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'owner'));
