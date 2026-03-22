-- 为 posts.tags 数组列添加 GIN 索引，加速标签查询
-- 作者: X
-- 日期: 2026-02-28

CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
