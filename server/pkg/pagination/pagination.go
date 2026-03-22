package pagination

const (
	DefaultPage = 1
	DefaultSize = 10
	MaxSize     = 100
)

type Params struct {
	Page int
	Size int
}

func NewParams(page, size int) Params {
	if page < 1 {
		page = DefaultPage
	}
	if size < 1 {
		size = DefaultSize
	}
	if size > MaxSize {
		size = MaxSize
	}
	return Params{Page: page, Size: size}
}

func (p Params) Offset() int {
	return (p.Page - 1) * p.Size
}

// Result 分页响应包装
type Result[T any] struct {
	Items    []T   `json:"items"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
}

func NewResult[T any](items []T, total int64, params Params) Result[T] {
	if items == nil {
		items = []T{}
	}
	return Result[T]{
		Items:    items,
		Total:    total,
		Page:     params.Page,
		PageSize: params.Size,
	}
}
