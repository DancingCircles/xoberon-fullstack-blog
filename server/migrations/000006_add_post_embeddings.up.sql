CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE post_embeddings (
    post_id    UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    embedding  vector(1024),
    model      VARCHAR(50) NOT NULL DEFAULT 'embedding-3',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat 近似最近邻索引，适合万级数据量
CREATE INDEX idx_post_embeddings_ivfflat
    ON post_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
