package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server     ServerConfig
	DB         DBConfig
	Redis      RedisConfig
	JWT        JWTConfig
	Log        LogConfig
	CORS       CORSConfig
	Moderation ModerationConfig
}

type ModerationConfig struct {
	Enabled        bool          `mapstructure:"MODERATION_ENABLED"`
	Timeout        time.Duration `mapstructure:"MODERATION_TIMEOUT"`
	WorkerEnabled  bool          `mapstructure:"MODERATION_WORKER_ENABLED"`
	WorkerInterval time.Duration `mapstructure:"MODERATION_WORKER_INTERVAL"`
	Qwen           QwenConfig
}

type QwenConfig struct {
	APIKey  string `mapstructure:"QWEN_API_KEY"`
	Model   string `mapstructure:"QWEN_MODEL"`
	BaseURL string `mapstructure:"QWEN_BASE_URL"`
}

type ServerConfig struct {
	Port            string        `mapstructure:"SERVER_PORT"`
	MetricsPort     string        `mapstructure:"SERVER_METRICS_PORT"`
	MetricsAddr     string        `mapstructure:"SERVER_METRICS_ADDR"`
	Mode            string        `mapstructure:"GIN_MODE"`
	ShutdownTimeout time.Duration `mapstructure:"SERVER_SHUTDOWN_TIMEOUT"`
	// TrustedProxies 信任的反向代理 IP 列表，防止 ClientIP() 被伪造
	TrustedProxies  []string
}

type CORSConfig struct {
	AllowedOrigins []string
}

type DBConfig struct {
	Host            string        `mapstructure:"DB_HOST"`
	Port            string        `mapstructure:"DB_PORT"`
	User            string        `mapstructure:"DB_USER"`
	Password        string        `mapstructure:"DB_PASSWORD"`
	Name            string        `mapstructure:"DB_NAME"`
	SSLMode         string        `mapstructure:"DB_SSLMODE"`
	MaxOpenConns    int           `mapstructure:"DB_MAX_OPEN_CONNS"`
	MaxIdleConns    int           `mapstructure:"DB_MAX_IDLE_CONNS"`
	ConnMaxLifetime time.Duration `mapstructure:"DB_CONN_MAX_LIFETIME"`
	ConnMaxIdleTime time.Duration `mapstructure:"DB_CONN_MAX_IDLE_TIME"`
}

type RedisConfig struct {
	Addr            string        `mapstructure:"REDIS_ADDR"`
	Password        string        `mapstructure:"REDIS_PASSWORD"`
	DB              int           `mapstructure:"REDIS_DB"`
	CacheListTTL    time.Duration `mapstructure:"REDIS_CACHE_LIST_TTL"`
	CacheDetailTTL  time.Duration `mapstructure:"REDIS_CACHE_DETAIL_TTL"`
	NullMarkerTTL   time.Duration `mapstructure:"REDIS_NULL_MARKER_TTL"`
}

type JWTConfig struct {
	Secret            string        `mapstructure:"JWT_SECRET"`
	AccessExpiration  time.Duration `mapstructure:"JWT_ACCESS_EXPIRATION"`
	RefreshExpiration time.Duration `mapstructure:"JWT_REFRESH_EXPIRATION"`
}

type LogConfig struct {
	Level  string `mapstructure:"LOG_LEVEL"`
	Format string `mapstructure:"LOG_FORMAT"`
}

func (d *DBConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode,
	)
}

func Load() (*Config, error) {
	v := viper.New()

	v.SetConfigFile(".env")
	v.SetConfigType("env")
	v.AutomaticEnv()

	// 默认值
	v.SetDefault("SERVER_PORT", "8080")
	v.SetDefault("SERVER_METRICS_PORT", "9091")
	v.SetDefault("SERVER_METRICS_ADDR", "127.0.0.1")
	v.SetDefault("GIN_MODE", "debug")
	v.SetDefault("SERVER_SHUTDOWN_TIMEOUT", "10s")
	v.SetDefault("SERVER_TRUSTED_PROXIES", "127.0.0.1,::1")
	v.SetDefault("DB_HOST", "localhost")
	v.SetDefault("DB_PORT", "5432")
	v.SetDefault("DB_SSLMODE", "require")
	v.SetDefault("DB_MAX_OPEN_CONNS", 25)
	v.SetDefault("DB_MAX_IDLE_CONNS", 10)
	v.SetDefault("DB_CONN_MAX_LIFETIME", "5m")
	v.SetDefault("DB_CONN_MAX_IDLE_TIME", "3m")
	v.SetDefault("REDIS_ADDR", "localhost:6379")
	v.SetDefault("REDIS_DB", 0)
	v.SetDefault("REDIS_CACHE_LIST_TTL", "5m")
	v.SetDefault("REDIS_CACHE_DETAIL_TTL", "10m")
	v.SetDefault("REDIS_NULL_MARKER_TTL", "30s")
	v.SetDefault("JWT_ACCESS_EXPIRATION", "24h")
	v.SetDefault("JWT_REFRESH_EXPIRATION", "168h")
	v.SetDefault("LOG_LEVEL", "debug")
	v.SetDefault("LOG_FORMAT", "console")
	v.SetDefault("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
	v.SetDefault("MODERATION_ENABLED", false)
	v.SetDefault("MODERATION_TIMEOUT", "10s")
	v.SetDefault("MODERATION_WORKER_ENABLED", false)
	v.SetDefault("MODERATION_WORKER_INTERVAL", "5m")
	v.SetDefault("QWEN_MODEL", "qwen-turbo")
	v.SetDefault("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")

	// .env 文件不存在不报错，靠环境变量兜底
	_ = v.ReadInConfig()

	cfg := &Config{}
	cfg.Server.Port = v.GetString("SERVER_PORT")
	cfg.Server.MetricsPort = v.GetString("SERVER_METRICS_PORT")
	cfg.Server.MetricsAddr = v.GetString("SERVER_METRICS_ADDR")
	cfg.Server.Mode = v.GetString("GIN_MODE")
	cfg.Server.ShutdownTimeout = v.GetDuration("SERVER_SHUTDOWN_TIMEOUT")

	rawProxies := v.GetString("SERVER_TRUSTED_PROXIES")
	for _, p := range strings.Split(rawProxies, ",") {
		p = strings.TrimSpace(p)
		if p != "" {
			cfg.Server.TrustedProxies = append(cfg.Server.TrustedProxies, p)
		}
	}

	cfg.DB.Host = v.GetString("DB_HOST")
	cfg.DB.Port = v.GetString("DB_PORT")
	cfg.DB.User = v.GetString("DB_USER")
	cfg.DB.Password = v.GetString("DB_PASSWORD")
	cfg.DB.Name = v.GetString("DB_NAME")
	cfg.DB.SSLMode = v.GetString("DB_SSLMODE")
	cfg.DB.MaxOpenConns = v.GetInt("DB_MAX_OPEN_CONNS")
	cfg.DB.MaxIdleConns = v.GetInt("DB_MAX_IDLE_CONNS")
	cfg.DB.ConnMaxLifetime = v.GetDuration("DB_CONN_MAX_LIFETIME")
	cfg.DB.ConnMaxIdleTime = v.GetDuration("DB_CONN_MAX_IDLE_TIME")

	cfg.Redis.Addr = v.GetString("REDIS_ADDR")
	cfg.Redis.Password = v.GetString("REDIS_PASSWORD")
	cfg.Redis.DB = v.GetInt("REDIS_DB")
	cfg.Redis.CacheListTTL = v.GetDuration("REDIS_CACHE_LIST_TTL")
	cfg.Redis.CacheDetailTTL = v.GetDuration("REDIS_CACHE_DETAIL_TTL")
	cfg.Redis.NullMarkerTTL = v.GetDuration("REDIS_NULL_MARKER_TTL")

	cfg.JWT.Secret = v.GetString("JWT_SECRET")
	cfg.JWT.AccessExpiration = v.GetDuration("JWT_ACCESS_EXPIRATION")
	cfg.JWT.RefreshExpiration = v.GetDuration("JWT_REFRESH_EXPIRATION")

	cfg.Log.Level = v.GetString("LOG_LEVEL")
	cfg.Log.Format = v.GetString("LOG_FORMAT")

	rawOrigins := v.GetString("CORS_ALLOWED_ORIGINS")
	if rawOrigins != "" {
		for _, o := range strings.Split(rawOrigins, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				cfg.CORS.AllowedOrigins = append(cfg.CORS.AllowedOrigins, o)
			}
		}
	}

	cfg.Moderation.Enabled = v.GetBool("MODERATION_ENABLED")
	cfg.Moderation.Timeout = v.GetDuration("MODERATION_TIMEOUT")
	cfg.Moderation.WorkerEnabled = v.GetBool("MODERATION_WORKER_ENABLED")
	cfg.Moderation.WorkerInterval = v.GetDuration("MODERATION_WORKER_INTERVAL")
	cfg.Moderation.Qwen.APIKey = v.GetString("QWEN_API_KEY")
	cfg.Moderation.Qwen.Model = v.GetString("QWEN_MODEL")
	cfg.Moderation.Qwen.BaseURL = v.GetString("QWEN_BASE_URL")

	if cfg.JWT.Secret == "" {
		return nil, fmt.Errorf("JWT_SECRET 必须配置")
	}
	if len(cfg.JWT.Secret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET 长度不足，至少 32 字符")
	}
	if cfg.DB.User == "" || cfg.DB.Name == "" {
		return nil, fmt.Errorf("数据库配置不完整：DB_USER 和 DB_NAME 必填")
	}

	return cfg, nil
}
