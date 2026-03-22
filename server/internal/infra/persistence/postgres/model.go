package postgres

import (
	"database/sql/driver"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ---- 数据库行模型（对应 SQL 表结构）----

type userRow struct {
	ID        uuid.UUID `db:"id"`
	Username  string    `db:"username"`
	Email     string    `db:"email"`
	Password  string    `db:"password"`
	Name      string    `db:"name"`
	Handle    string    `db:"handle"`
	Avatar    string    `db:"avatar"`
	Bio       string    `db:"bio"`
	Role      string    `db:"role"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

type adminUserRow struct {
	ID         uuid.UUID `db:"id"`
	Username   string    `db:"username"`
	Email      string    `db:"email"`
	Name       string    `db:"name"`
	Handle     string    `db:"handle"`
	Avatar     string    `db:"avatar"`
	Bio        string    `db:"bio"`
	Role       string    `db:"role"`
	CreatedAt  time.Time `db:"created_at"`
	UpdatedAt  time.Time `db:"updated_at"`
	PostCount  int64     `db:"post_count"`
	EssayCount int64     `db:"essay_count"`
}

type postRow struct {
	ID              uuid.UUID   `db:"id"`
	AuthorID        uuid.UUID   `db:"author_id"`
	Title           string      `db:"title"`
	Slug            string      `db:"slug"`
	Excerpt         string      `db:"excerpt"`
	Content         string      `db:"content"`
	Category        string      `db:"category"`
	Tags            StringArray `db:"tags"`
	LikeCount       int         `db:"like_count"`
	ReadTimeMinutes int         `db:"read_time_minutes"`
	ReviewStatus    string      `db:"review_status"`
	CreatedAt       time.Time   `db:"created_at"`
	UpdatedAt       time.Time   `db:"updated_at"`
	// JOIN 字段
	AuthorName   string `db:"author_name"`
	AuthorAvatar string `db:"author_avatar"`
	AuthorHandle string `db:"author_handle"`
}

type essayRow struct {
	ID           uuid.UUID `db:"id"`
	AuthorID     uuid.UUID `db:"author_id"`
	Title        string    `db:"title"`
	Excerpt      string    `db:"excerpt"`
	Content      string    `db:"content"`
	LikeCount    int       `db:"like_count"`
	ReviewStatus string    `db:"review_status"`
	CreatedAt    time.Time `db:"created_at"`
	UpdatedAt    time.Time `db:"updated_at"`
	// JOIN 字段
	AuthorName   string `db:"author_name"`
	AuthorAvatar string `db:"author_avatar"`
	AuthorHandle string `db:"author_handle"`
}

type commentRow struct {
	ID           uuid.UUID `db:"id"`
	PostID       uuid.UUID `db:"post_id"`
	AuthorID     uuid.UUID `db:"author_id"`
	Content      string    `db:"content"`
	ReviewStatus string    `db:"review_status"`
	CreatedAt    time.Time `db:"created_at"`
	// JOIN 字段
	AuthorName   string `db:"author_name"`
	AuthorAvatar string `db:"author_avatar"`
}

type contactRow struct {
	ID        uuid.UUID `db:"id"`
	Name      string    `db:"name"`
	Email     string    `db:"email"`
	Message   string    `db:"message"`
	IsRead    bool      `db:"is_read"`
	CreatedAt time.Time `db:"created_at"`
}

// ---- UUIDArray: PostgreSQL UUID[] 类型的 Go 映射 ----

type UUIDArray []uuid.UUID

// Value 实现 driver.Valuer，输出 PG 数组格式 {uuid1,uuid2,...}
func (a UUIDArray) Value() (driver.Value, error) {
	if len(a) == 0 {
		return "{}", nil
	}
	parts := make([]string, len(a))
	for i, id := range a {
		parts[i] = id.String()
	}
	return fmt.Sprintf("{%s}", strings.Join(parts, ",")), nil
}

// ---- StringArray: PostgreSQL TEXT[] 类型的 Go 映射 ----

type StringArray []string

// Scan 实现 sql.Scanner，解析 PG 数组格式 {a,b,c}
func (a *StringArray) Scan(src interface{}) error {
	if src == nil {
		*a = StringArray{}
		return nil
	}

	var raw string
	switch v := src.(type) {
	case string:
		raw = v
	case []byte:
		raw = string(v)
	default:
		return fmt.Errorf("StringArray.Scan: 不支持的类型 %T", src)
	}

	raw = strings.TrimSpace(raw)
	if raw == "{}" || raw == "" {
		*a = StringArray{}
		return nil
	}

	// 去掉首尾大括号
	raw = strings.TrimPrefix(raw, "{")
	raw = strings.TrimSuffix(raw, "}")

	parts := strings.Split(raw, ",")
	result := make(StringArray, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		p = strings.Trim(p, "\"")
		if p != "" {
			result = append(result, p)
		}
	}
	*a = result
	return nil
}

// Value 实现 driver.Valuer，输出 PG 数组格式
func (a StringArray) Value() (driver.Value, error) {
	if len(a) == 0 {
		return "{}", nil
	}

	quoted := make([]string, len(a))
	for i, s := range a {
		escaped := strings.ReplaceAll(s, `\`, `\\`)
		escaped = strings.ReplaceAll(escaped, `"`, `\"`)
		quoted[i] = fmt.Sprintf(`"%s"`, escaped)
	}
	return fmt.Sprintf("{%s}", strings.Join(quoted, ",")), nil
}
