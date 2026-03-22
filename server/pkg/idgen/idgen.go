package idgen

import "github.com/google/uuid"

// New 生成 UUID v7（RFC 9562），前 48 位为毫秒时间戳，天然有序，
// 相比 v4 可显著降低 B-Tree 索引页分裂。
func New() uuid.UUID {
	return uuid.Must(uuid.NewV7())
}
