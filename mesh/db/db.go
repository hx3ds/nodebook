package db

import (
	"context"
	"fmt"
	"mesh/config"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func InitDB(cfg *config.Config) (*DB, error) {
	connStr := fmt.Sprintf("postgres://%s:%s@%s:%d/%s",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)

	pool, err := pgxpool.New(context.Background(), connStr)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	db := &DB{Pool: pool}
	if err := db.migrate(); err != nil {
		return nil, err
	}

	return db, nil
}

func (db *DB) migrate() error {
	ctx := context.Background()

	// Users table
	_, err := db.Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			email TEXT UNIQUE,
			telegram_id BIGINT UNIQUE,
			name TEXT,
			avatar_url TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}

	// Email verification codes table
	_, err = db.Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS email_codes (
			email TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			expires_at TIMESTAMP WITH TIME ZONE NOT NULL
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create email_codes table: %w", err)
	}

	return nil
}

func (db *DB) Close() {
	db.Pool.Close()
}

// DB Operations

func (db *DB) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	err := db.Pool.QueryRow(ctx, "SELECT id, email, telegram_id, name, avatar_url FROM users WHERE email = $1", email).
		Scan(&user.ID, &user.Email, &user.TelegramID, &user.Name, &user.AvatarURL)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (db *DB) GetUserByTelegramID(ctx context.Context, telegramID int64) (*User, error) {
	var user User
	err := db.Pool.QueryRow(ctx, "SELECT id, email, telegram_id, name, avatar_url FROM users WHERE telegram_id = $1", telegramID).
		Scan(&user.ID, &user.Email, &user.TelegramID, &user.Name, &user.AvatarURL)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (db *DB) CreateUser(ctx context.Context, user *User) error {
	err := db.Pool.QueryRow(ctx,
		"INSERT INTO users (email, telegram_id, name, avatar_url) VALUES ($1, $2, $3, $4) RETURNING id",
		user.Email, user.TelegramID, user.Name, user.AvatarURL).Scan(&user.ID)
	return err
}

func (db *DB) UpdateUser(ctx context.Context, user *User) error {
	_, err := db.Pool.Exec(ctx,
		"UPDATE users SET name=$1, avatar_url=$2 WHERE id=$3",
		user.Name, user.AvatarURL, user.ID)
	return err
}

func (db *DB) SaveEmailCode(ctx context.Context, email, code string, duration time.Duration) error {
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO email_codes (email, code, expires_at) 
		VALUES ($1, $2, $3) 
		ON CONFLICT (email) DO UPDATE 
		SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at
	`, email, code, time.Now().Add(duration))
	return err
}

func (db *DB) VerifyEmailCode(ctx context.Context, email, code string) (bool, error) {
	var valid bool
	err := db.Pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM email_codes WHERE email=$1 AND code=$2 AND expires_at > NOW())", email, code).Scan(&valid)
	if err != nil {
		return false, err
	}
	if valid {
		// Delete code after usage
		_, _ = db.Pool.Exec(ctx, "DELETE FROM email_codes WHERE email=$1", email)
	}
	return valid, nil
}

type User struct {
	ID         int     `json:"id"`
	Email      *string `json:"email,omitempty"`
	TelegramID *int64  `json:"telegram_id,omitempty"`
	Name       string  `json:"name"`
	AvatarURL  string  `json:"avatar_url"`
}
