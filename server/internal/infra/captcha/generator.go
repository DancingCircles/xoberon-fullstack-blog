package captcha

import (
	"image/color"
	"strings"

	"github.com/mojocn/base64Captcha"
)

// Generator 提供验证码生成与校验能力。
type Generator interface {
	Generate() (id string, base64Image string, err error)
	Verify(id, code string) bool
}

type generator struct {
	captcha *base64Captcha.Captcha
}

// NewGenerator 创建验证码生成器。store 需实现 base64Captcha.Store 接口。
func NewGenerator(store base64Captcha.Store) Generator {
	driver := (&base64Captcha.DriverString{
		Height:          48,
		Width:           140,
		NoiseCount:      10,
		ShowLineOptions: 0,
		Length:          4,
		Source:          "23456789abcdefghjkmnpqrstuvwxyz",
		BgColor:         &color.RGBA{R: 237, G: 234, B: 216, A: 255},
		Fonts:           []string{"wqy-microhei.ttc"},
	}).ConvertFonts()
	return &generator{
		captcha: base64Captcha.NewCaptcha(driver, store),
	}
}

func (g *generator) Generate() (string, string, error) {
	id, b64s, _, err := g.captcha.Generate()
	return id, b64s, err
}

func (g *generator) Verify(id, code string) bool {
	return g.captcha.Verify(id, strings.ToLower(code), true)
}
