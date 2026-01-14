package api

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type FileItem struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	IsDirectory bool   `json:"isDirectory"`
}

type MeshFSHandler struct {
	RootPath string
}

func NewMeshFSHandler(rootPath string) *MeshFSHandler {
	// Ensure root path exists
	if _, err := os.Stat(rootPath); os.IsNotExist(err) {
		os.MkdirAll(rootPath, 0755)
	}
	return &MeshFSHandler{RootPath: rootPath}
}

// HandlePath handles all file system operations
func (h *MeshFSHandler) HandlePath(w http.ResponseWriter, r *http.Request) {
	// 1. Parse and sanitize path
	urlPath := strings.TrimPrefix(r.URL.Path, "/mesh")
	urlPath = strings.Trim(urlPath, "/")

	// Prevent directory traversal
	if strings.Contains(urlPath, "..") {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	// Construct local system path
	// Note: filepath.Join handles OS-specific separators
	relPath := filepath.FromSlash(urlPath)
	fullPath := filepath.Join(h.RootPath, relPath)

	// 2. Dispatch based on Method
	switch r.Method {
	case http.MethodGet:
		h.handleGet(w, fullPath, urlPath)
	case http.MethodPost:
		h.handlePost(w, r, fullPath)
	case http.MethodDelete:
		h.handleDelete(w, fullPath)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *MeshFSHandler) handleGet(w http.ResponseWriter, fullPath, urlPath string) {
	info, err := os.Stat(fullPath)
	if os.IsNotExist(err) {
		// If root or user root doesn't exist, treat as empty directory?
		// For root, we create it in NewMeshFSHandler.
		// For subpaths, return 404.
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if info.IsDir() {
		entries, err := os.ReadDir(fullPath)
		if err != nil {
			http.Error(w, "Failed to read directory", http.StatusInternalServerError)
			return
		}

		items := []FileItem{}
		for _, entry := range entries {
			// Construct the web-accessible path
			// mesh://path/to/item
			itemName := entry.Name()
			itemPath := "mesh://"
			if urlPath != "" {
				itemPath += urlPath + "/" + itemName
			} else {
				itemPath += itemName
			}

			items = append(items, FileItem{
				Name:        itemName,
				Path:        itemPath,
				IsDirectory: entry.IsDir(),
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(items)
	} else {
		// It's a file, serve content
		content, err := os.ReadFile(fullPath)
		if err != nil {
			http.Error(w, "Failed to read file", http.StatusInternalServerError)
			return
		}
		// Detect content type? Or just text/plain for now?
		// Client expects text or json.
		w.Write(content)
	}
}

func (h *MeshFSHandler) handlePost(w http.ResponseWriter, r *http.Request, fullPath string) {
	// Check query param for directory creation
	query := r.URL.Query()
	isDir := query.Get("type") == "directory"

	if isDir {
		err := os.MkdirAll(fullPath, 0755)
		if err != nil {
			http.Error(w, "Failed to create directory", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Directory created"))
		return
	}

	// It's a file write
	// Ensure parent dir exists
	parentDir := filepath.Dir(fullPath)
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		http.Error(w, "Failed to create parent directory", http.StatusInternalServerError)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close()

	err = os.WriteFile(fullPath, body, 0644)
	if err != nil {
		http.Error(w, "Failed to write file", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("File saved"))
}

func (h *MeshFSHandler) handleDelete(w http.ResponseWriter, fullPath string) {
	// Use RemoveAll to handle directories and files
	err := os.RemoveAll(fullPath)
	if err != nil {
		http.Error(w, "Failed to delete", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *MeshFSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.HandlePath(w, r)
}

// Remove old handlers to avoid confusion (or keep them if needed, but ServeHTTP overrides)
