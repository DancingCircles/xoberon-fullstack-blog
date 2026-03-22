DROP INDEX IF EXISTS idx_users_handle_trgm;
DROP INDEX IF EXISTS idx_users_name_trgm;
DROP INDEX IF EXISTS idx_essays_content_trgm;
DROP INDEX IF EXISTS idx_essays_excerpt_trgm;
DROP INDEX IF EXISTS idx_essays_title_trgm;
DROP INDEX IF EXISTS idx_posts_content_trgm;
DROP INDEX IF EXISTS idx_posts_excerpt_trgm;
DROP INDEX IF EXISTS idx_posts_title_trgm;
-- pg_trgm 扩展不轻易删除，可能被其他功能使用
