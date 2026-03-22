-- XOBERON 初始数据库结构
-- 作者: X
-- 日期: 2026-02-28

-- ==========================================
-- 用户表
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    handle      VARCHAR(60)  NOT NULL UNIQUE,
    avatar      TEXT         DEFAULT '',
    bio         TEXT         DEFAULT '',
    role        VARCHAR(20)  DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 博客文章表
-- ==========================================
CREATE TABLE IF NOT EXISTS posts (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    slug              VARCHAR(255) NOT NULL UNIQUE,
    excerpt           TEXT         DEFAULT '',
    content           TEXT         NOT NULL,
    category          VARCHAR(50)  NOT NULL CHECK (category IN ('Design', 'Tech', 'Culture')),
    tags              TEXT[]       DEFAULT '{}',
    like_count        INTEGER      DEFAULT 0 CHECK (like_count >= 0),
    read_time_minutes INTEGER      DEFAULT 1 CHECK (read_time_minutes >= 1),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_author   ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_created  ON posts(created_at DESC);

-- ==========================================
-- 随笔表
-- ==========================================
CREATE TABLE IF NOT EXISTS essays (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    excerpt     TEXT         DEFAULT '',
    content     TEXT         NOT NULL,
    like_count  INTEGER      DEFAULT 0 CHECK (like_count >= 0),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_essays_author  ON essays(author_id);
CREATE INDEX idx_essays_created ON essays(created_at DESC);

-- ==========================================
-- 评论表
-- ==========================================
CREATE TABLE IF NOT EXISTS comments (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID         NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);

-- ==========================================
-- 联系消息表
-- ==========================================
CREATE TABLE IF NOT EXISTS contacts (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    message     TEXT         NOT NULL,
    is_read     BOOLEAN      DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 点赞记录表（多态关联 posts / essays）
-- ==========================================
CREATE TABLE IF NOT EXISTS likes (
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id   UUID         NOT NULL,
    target_type VARCHAR(10)  NOT NULL CHECK (target_type IN ('post', 'essay')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, target_id, target_type)
);

CREATE INDEX idx_likes_target ON likes(target_id, target_type);
