package config

import (
	"encoding/json"
	"os"
)

type Config struct {
	Env             string `json:"ENV"`
	DBHost          string `json:"DB_HOST"`
	DBPort          int    `json:"DB_PORT"`
	DBName          string `json:"DB_NAME"`
	DBUser          string `json:"DB_USER"`
	DBPassword      string `json:"DB_PASSWORD"`
	Host            string `json:"HOST"`
	Port            int    `json:"PORT"`
	SMTPHost        string `json:"SMTP_HOST"`
	SMTPPort        int    `json:"SMTP_PORT"`
	SMTPUsername    string `json:"SMTP_USERNAME"`
	SMTPPassword    string `json:"SMTP_PASSWORD"`
	SMTPFromEmail   string `json:"SMTP_FROM_EMAIL"`
	AdminBotToken   string `json:"ADMIN_BOT_TOKEN"`
	TelegramBaseURL string `json:"TELEGRAM_BASE_URL"`
	JWTSecretKey    string `json:"JWT_SECRET_KEY"`
	JWTCookieName   string `json:"JWT_COOKIE_NAME"`
}

func LoadConfig(path string) (*Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	cfg := &Config{}
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}
