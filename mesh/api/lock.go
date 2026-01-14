package api

import (
	"encoding/json"
	"log"
	"mesh/ws"
	"net/http"
	"sync"
	"time"
)

type LockInfo struct {
	Path      string    `json:"path"`
	ItemID    string    `json:"itemId,omitempty"`
	ClientID  string    `json:"clientId"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type LockManager struct {
	locks map[string]LockInfo
	mu    sync.Mutex
	hub   *ws.Hub
}

func NewLockManager(hub *ws.Hub) *LockManager {
	return &LockManager{
		locks: make(map[string]LockInfo),
		hub:   hub,
	}
}

func (lm *LockManager) Acquire(path, itemId, clientId string, duration time.Duration) bool {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	key := path
	if itemId != "" {
		key = path + "#" + itemId
	}

	now := time.Now()
	// Check if locked
	if lock, exists := lm.locks[key]; exists {
		if lock.ExpiresAt.After(now) && lock.ClientID != clientId {
			return false // Locked by someone else
		}
	}

	// Lock it
	lockInfo := LockInfo{
		Path:      path,
		ItemID:    itemId,
		ClientID:  clientId,
		ExpiresAt: now.Add(duration),
	}
	lm.locks[key] = lockInfo

	log.Printf("Lock acquired: User=%s Path=%s ItemID=%s", clientId, path, itemId)

	// Broadcast
	if lm.hub != nil {
		msg, _ := json.Marshal(map[string]interface{}{
			"type": "acquired",
			"lock": lockInfo,
		})
		lm.hub.Broadcast(msg)
	}

	return true
}

func (lm *LockManager) Release(path, itemId, clientId string) {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	key := path
	if itemId != "" {
		key = path + "#" + itemId
	}

	if lock, exists := lm.locks[key]; exists {
		if lock.ClientID == clientId {
			delete(lm.locks, key)

			log.Printf("Lock released: User=%s Path=%s ItemID=%s", clientId, path, itemId)

			// Broadcast
			if lm.hub != nil {
				msg, _ := json.Marshal(map[string]interface{}{
					"type":     "released",
					"path":     path,
					"itemId":   itemId,
					"clientId": clientId,
				})
				lm.hub.Broadcast(msg)
			}
		}
	}
}

func (lm *LockManager) GetLocks(prefix string) map[string]LockInfo {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	now := time.Now()
	activeLocks := make(map[string]LockInfo)
	for k, v := range lm.locks {
		if v.ExpiresAt.After(now) {
			if prefix == "" || v.Path == prefix {
				activeLocks[k] = v
			}
		} else {
			delete(lm.locks, k)
		}
	}
	return activeLocks
}

func (lm *LockManager) HandleLock(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Path     string `json:"path"`
		ItemID   string `json:"itemId"`
		ClientID string `json:"clientId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if lm.Acquire(req.Path, req.ItemID, req.ClientID, 5*time.Minute) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	} else {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]bool{"success": false})
	}
}

func (lm *LockManager) HandleUnlock(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Path     string `json:"path"`
		ItemID   string `json:"itemId"`
		ClientID string `json:"clientId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	lm.Release(req.Path, req.ItemID, req.ClientID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (lm *LockManager) HandleGetLocks(w http.ResponseWriter, r *http.Request) {
	pathPrefix := r.URL.Query().Get("path")
	locks := lm.GetLocks(pathPrefix)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(locks)
}
