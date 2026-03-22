DROP TRIGGER IF EXISTS set_updated_at_users ON users;
DROP TRIGGER IF EXISTS set_updated_at_posts ON posts;
DROP TRIGGER IF EXISTS set_updated_at_essays ON essays;
DROP FUNCTION IF EXISTS trigger_set_updated_at();
