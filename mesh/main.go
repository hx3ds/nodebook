package main

import (
	"encoding/json"
	"fmt"
	"log"
	"mesh/api"
	"mesh/config"
	"mesh/db"
	"mesh/ws"
	"net/http"
	"time"
)

func main() {
	// 1. Load Config
	cfg, err := config.LoadConfig("../mesh.json")
	if err != nil {
		// Fallback to local mesh.json if parent not found
		cfg, err = config.LoadConfig("mesh.json")
		if err != nil {
			log.Fatalf("Failed to load config: %v", err)
		}
	}

	// 2. Init DB
	database, err := db.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// 3. Fetch Bot Username
	botUsername, err := fetchBotUsername(cfg)
	if err != nil {
		log.Printf("Warning: Failed to fetch bot username: %v", err)
	} else {
		log.Printf("Bot Username: %s", botUsername)
	}

	// 4. Setup Handler
	authHandler := &api.AuthHandler{
		Config:      cfg,
		DB:          database,
		BotUsername: botUsername,
	}
	meshHandler := api.NewMeshFSHandler("public_mesh")

	hub := ws.NewHub()
	go hub.Run()

	lockManager := api.NewLockManager(hub)

	mux := http.NewServeMux()
	mux.Handle("/mesh/", meshHandler)
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		ws.ServeWs(hub, w, r)
	})
	mux.HandleFunc("/lock", lockManager.HandleLock)
	mux.HandleFunc("/unlock", lockManager.HandleUnlock)
	mux.HandleFunc("/locks", lockManager.HandleGetLocks)
	mux.HandleFunc("/auth/telegram/login", authHandler.HandleTelegramLogin)
	mux.HandleFunc("/auth/email/login", authHandler.HandleEmailLoginRequest)
	mux.HandleFunc("/auth/email/verify", authHandler.HandleEmailLoginVerify)
	mux.HandleFunc("/auth/me", authHandler.HandleMe)
	mux.HandleFunc("/auth/config", authHandler.HandleConfig)

	// Wrap with CORS
	handler := corsMiddleware(mux)

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func fetchBotUsername(cfg *config.Config) (string, error) {
	url := fmt.Sprintf("%s%s/getMe", cfg.TelegramBaseURL, cfg.AdminBotToken)
	client := http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("telegram api returned status: %d", resp.StatusCode)
	}

	var result struct {
		Ok     bool `json:"ok"`
		Result struct {
			Username string `json:"username"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if !result.Ok {
		return "", fmt.Errorf("telegram api result not ok")
	}

	return result.Result.Username, nil
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*") // Adjust for production
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
