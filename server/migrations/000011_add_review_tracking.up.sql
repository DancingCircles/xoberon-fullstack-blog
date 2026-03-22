-- 审核记录追踪：记录操作人和操作时间
-- 作者: X
-- 日期: 2026-03-02

-- reviewed_by: 区分 AI 自动审核 ('ai') 和管理员手动操作 ('admin')
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(20) NOT NULL DEFAULT '';

-- reviewed_at: 审核/删除操作的执行时间
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
