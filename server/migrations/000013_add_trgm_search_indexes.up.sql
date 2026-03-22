-- 启用 pg_trgm 三元组扩展 + GIN 索引，加速 ILIKE 搜索（中文友好，零外部依赖）
-- 作者: X
-- 日期: 2026-03-02

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 文章搜索索引
CREATE INDEX idx_posts_title_trgm ON posts USING GIN (title gin_trgm_ops);
CREATE INDEX idx_posts_excerpt_trgm ON posts USING GIN (excerpt gin_trgm_ops);
CREATE INDEX idx_posts_content_trgm ON posts USING GIN (content gin_trgm_ops);

-- 随笔搜索索引
CREATE INDEX idx_essays_title_trgm ON essays USING GIN (title gin_trgm_ops);
CREATE INDEX idx_essays_excerpt_trgm ON essays USING GIN (excerpt gin_trgm_ops);
CREATE INDEX idx_essays_content_trgm ON essays USING GIN (content gin_trgm_ops);

-- 用户搜索索引
CREATE INDEX idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);
CREATE INDEX idx_users_handle_trgm ON users USING GIN (handle gin_trgm_ops);
