-- 去掉无意义的 ai_confidence，改为记录 AI 三态判定结果
-- 作者: X
-- 日期: 2026-03-02

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ai_decision VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE reviews DROP COLUMN IF EXISTS ai_confidence;
