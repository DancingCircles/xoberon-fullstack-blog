DROP INDEX IF EXISTS idx_posts_review_status;
ALTER TABLE posts DROP COLUMN IF EXISTS review_status;
