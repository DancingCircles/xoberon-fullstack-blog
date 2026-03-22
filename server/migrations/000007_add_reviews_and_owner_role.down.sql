DROP INDEX IF EXISTS idx_reviews_content;
DROP INDEX IF EXISTS idx_reviews_status;
DROP TABLE IF EXISTS reviews;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
