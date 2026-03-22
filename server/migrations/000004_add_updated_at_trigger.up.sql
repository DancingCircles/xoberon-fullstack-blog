-- 自动更新 updated_at 字段的触发器函数
-- 作者: X
-- 日期: 2026-02-28

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_posts
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_essays
    BEFORE UPDATE ON essays
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
