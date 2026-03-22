package logger

import (
	"os"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	global *zap.Logger
	once   sync.Once
)

// Init 设置全局 logger 实例（应在 main 中调用一次）
func Init(l *zap.Logger) {
	global = l
}

// L 返回全局 logger，未初始化时返回 nop logger
func L() *zap.Logger {
	once.Do(func() {
		if global == nil {
			global = zap.NewNop()
		}
	})
	return global
}

// New 创建结构化日志实例
// level: debug / info / warn / error
// format: console / json
func New(level, format string) *zap.Logger {
	lvl := zapcore.InfoLevel
	_ = lvl.UnmarshalText([]byte(level))

	encoderCfg := zap.NewProductionEncoderConfig()
	encoderCfg.TimeKey = "ts"
	encoderCfg.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderCfg.EncodeLevel = zapcore.CapitalColorLevelEncoder

	var encoder zapcore.Encoder
	if format == "json" {
		encoderCfg.EncodeLevel = zapcore.CapitalLevelEncoder
		encoder = zapcore.NewJSONEncoder(encoderCfg)
	} else {
		encoder = zapcore.NewConsoleEncoder(encoderCfg)
	}

	core := zapcore.NewCore(encoder, zapcore.AddSync(os.Stdout), lvl)
	return zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))
}
