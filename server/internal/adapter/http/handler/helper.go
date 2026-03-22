package handler

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.uber.org/zap"

	"xoberon-server/internal/adapter/http/dto"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/pkg/logger"
	"xoberon-server/pkg/pagination"
)

// fieldTagMessages 存储各字段各校验标签对应的用户友好消息
var fieldTagMessages = map[string]map[string]string{
	"Username": {
		"required": "用户名不能为空",
		"min":      "用户名至少 3 个字符",
		"max":      "用户名不能超过 50 个字符",
	},
	"Email": {
		"required": "邮箱不能为空",
		"email":    "邮箱格式不正确",
	},
	"Password": {
		"required": "密码不能为空",
		"min":      "密码至少 8 位",
		"max":      "密码不能超过 72 位",
	},
	"Name": {
		"required": "昵称不能为空",
		"max":      "昵称不能超过 100 个字符",
	},
	"OldPassword": {
		"required": "旧密码不能为空",
	},
	"NewPassword": {
		"required": "新密码不能为空",
		"min":      "新密码至少 8 位",
		"max":      "新密码不能超过 72 位",
	},
	"Title": {
		"required": "标题不能为空",
		"max":      "标题过长",
	},
	"Content": {
		"required": "内容不能为空",
		"min":      "内容不能为空",
		"max":      "内容过长",
	},
	"Excerpt": {
		"max": "摘要不能超过 30 个字符",
	},
	"Category": {
		"required": "分类不能为空",
	},
	"Tags": {
		"max": "标签最多 3 个",
	},
	"Message": {
		"required": "留言内容不能为空",
		"max":      "留言不能超过 5000 个字符",
	},
	"Bio": {
		"max": "简介不能超过 500 个字符",
	},
	"Avatar": {
		"url": "头像地址格式不正确",
		"max": "头像地址不能超过 500 个字符",
	},
	"Role": {
		"required": "角色不能为空",
	},
}

// translateBindingError 将 Gin binding / go-playground/validator 的原始错误
// 转换为面向用户的中文提示，避免暴露内部结构体字段名和校验标签。
func translateBindingError(err error) string {
	var ve validator.ValidationErrors
	if !errors.As(err, &ve) {
		return "请求参数错误"
	}
	for _, fe := range ve {
		if fieldMsgs, ok := fieldTagMessages[fe.Field()]; ok {
			if msg, ok := fieldMsgs[fe.Tag()]; ok {
				return msg
			}
			return fmt.Sprintf("%s 格式不正确", fe.Field())
		}
	}
	return "请求参数错误"
}

// mapError 将 AppError 映射为 HTTP 状态码 + 错误响应
func mapError(c *gin.Context, err error) {
	var appErr *errs.AppError
	if errors.As(err, &appErr) {
		var status int
		switch appErr.Code() {
		case errs.CodeValidation:
			status = http.StatusBadRequest
		case errs.CodeUnauthorized:
			status = http.StatusUnauthorized
		case errs.CodeForbidden:
			status = http.StatusForbidden
		case errs.CodeNotFound:
			status = http.StatusNotFound
		case errs.CodeConflict:
			status = http.StatusConflict
		default:
			status = http.StatusInternalServerError
		}
		if status >= http.StatusInternalServerError && appErr.Unwrap() != nil {
			logger.L().Error("internal_error",
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
				zap.Error(appErr.Unwrap()),
			)
		}
		c.JSON(status, dto.ErrorResp{
			Error:   string(appErr.Code()),
			Message: appErr.Message(),
		})
		return
	}

	logger.L().Error("unhandled_error",
		zap.String("path", c.Request.URL.Path),
		zap.String("method", c.Request.Method),
		zap.Error(err),
	)
	c.JSON(http.StatusInternalServerError, dto.ErrorResp{
		Error:   "INTERNAL_ERROR",
		Message: "服务器内部错误",
	})
}

// parsePagination 从 query 参数解析分页
func parsePagination(c *gin.Context) pagination.Params {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	return pagination.NewParams(page, size)
}

// optionalQuery 获取可选的 query 参数，返回 *string（nil 表示未提供）
func optionalQuery(c *gin.Context, key string) *string {
	val := c.Query(key)
	if val == "" {
		return nil
	}
	return &val
}
