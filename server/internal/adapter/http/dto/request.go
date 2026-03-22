package dto

// ---- Auth ----

type RegisterReq struct {
	Username    string `json:"username" binding:"required,min=3,max=50"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8,max=72"`
	Name        string `json:"name" binding:"required,max=100"`
	CaptchaID   string `json:"captcha_id" binding:"required"`
	CaptchaCode string `json:"captcha_code" binding:"required"`
}

type LoginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// ---- Post ----

type CreatePostReq struct {
	Title    string   `json:"title" binding:"required,max=30"`
	Content  string   `json:"content" binding:"required,max=2000"`
	Category string   `json:"category" binding:"required"`
	Tags     []string `json:"tags" binding:"max=3,dive,max=30"`
}

type UpdatePostReq struct {
	Title    string   `json:"title" binding:"required,max=30"`
	Content  string   `json:"content" binding:"required,max=2000"`
	Category string   `json:"category" binding:"required"`
	Tags     []string `json:"tags" binding:"max=3,dive,max=30"`
}

// ---- Essay ----

type CreateEssayReq struct {
	Title   string `json:"title" binding:"required,max=20"`
	Excerpt string `json:"excerpt" binding:"omitempty,max=30"`
	Content string `json:"content" binding:"required,max=500"`
}

type UpdateEssayReq struct {
	Title   string `json:"title" binding:"required,max=20"`
	Excerpt string `json:"excerpt" binding:"omitempty,max=30"`
	Content string `json:"content" binding:"required,max=500"`
}

// ---- Comment ----

type CreateCommentReq struct {
	// min=1 防止提交纯空格内容，max=2000 防止超长评论
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

// ---- Contact ----

type ContactReq struct {
	Name     string `json:"name" binding:"required,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Message  string `json:"message" binding:"required,max=5000"`
	// Honeypot 蜜罐字段：前端隐藏，人类不会填写。非空则视为机器人提交。
	Honeypot string `json:"website" binding:""`
}

// ---- User ----

type UpdateProfileReq struct {
	Name string `json:"name" binding:"required,max=100"`
	Bio  string `json:"bio" binding:"omitempty,max=500"`
	// url 标签校验 URL 格式，防止存入任意字符串被后续服务作为 SSRF 攻击向量
	Avatar string `json:"avatar" binding:"omitempty,url,max=500"`
}

type ChangePasswordReq struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8,max=72"`
}

// ---- Admin ----

type UpdateRoleReq struct {
	Role string `json:"role" binding:"required"`
}
