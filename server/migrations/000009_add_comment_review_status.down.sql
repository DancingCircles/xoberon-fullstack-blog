DROP INDEX IF EXISTS idx_comments_review_status;

ALTER TABLE comments DROP COLUMN IF EXISTS review_status;
