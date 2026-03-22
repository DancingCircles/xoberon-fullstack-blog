DROP INDEX IF EXISTS idx_essays_review_status;

ALTER TABLE essays DROP COLUMN IF EXISTS review_status;
