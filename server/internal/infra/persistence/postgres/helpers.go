package postgres

import (
	"fmt"
	"strings"
)

// isUniqueViolation 判断是否为 PostgreSQL 唯一约束冲突错误 (SQLSTATE 23505)
func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "23505")
}

// uniqueViolationField 从 PG 唯一约束错误中提取冲突的字段名
func uniqueViolationField(err error) string {
	if err == nil {
		return ""
	}
	msg := err.Error()
	if !strings.Contains(msg, "23505") {
		return ""
	}
	// pgx 错误格式: ... constraint "users_username_key" ...
	// 约束命名惯例: {table}_{column}_key
	for _, field := range []string{"username", "email", "handle", "slug"} {
		if strings.Contains(msg, field) {
			return field
		}
	}
	return ""
}

// buildArg 构建带占位符的 WHERE 子句片段
func buildArg(idx *int, prefix string, args *[]interface{}, val interface{}) string {
	clause := fmt.Sprintf("%s$%d", prefix, *idx)
	if args != nil {
		*args = append(*args, val)
	}
	*idx++
	return clause
}

// escapeLike 转义 PostgreSQL LIKE/ILIKE 模式中的特殊字符（%, _, \），
// 防止用户输入大量通配符导致全表扫描（LIKE 注入型 DoS）。
// 使用时需在 SQL 中配合 ESCAPE '\' 子句。
func escapeLike(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}
