package server

import (
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"sync"

	"gopkg.in/yaml.v3"
)

// Config represents the top-level Puck configuration.
type Config struct {
	Version     string       `yaml:"version" json:"version"`
	Project     Project      `yaml:"project" json:"project"`
	Tools       []Tool       `yaml:"tools" json:"tools"`
	BranchRules []BranchRule `yaml:"branch_rules" json:"branch_rules"`
}

// Project holds the project metadata.
type Project struct {
	Name string `yaml:"name" json:"name"`
	Path string `yaml:"path" json:"path"`
}

// Tool describes an automation tool that Puck can execute.
type Tool struct {
	Name        string `yaml:"name" json:"name"`
	Enabled     bool   `yaml:"enabled" json:"enabled"`
	Description string `yaml:"description" json:"description"`
}

// BranchRule maps a branch to the tools and triggers that apply to it.
type BranchRule struct {
	Branch   string   `yaml:"branch" json:"branch"`
	Triggers []string `yaml:"triggers" json:"triggers"`
	Tools    []string `yaml:"tools" json:"tools"`
}

// Server holds the HTTP server state.
type Server struct {
	port   int
	dir    string
	uiFS   fs.FS
	config Config
	mu     sync.RWMutex
}

// New creates a new Server instance with the given UI filesystem and a default configuration.
func New(port int, dir string, uiFS fs.FS) *Server {
	return &Server{
		port: port,
		dir:  dir,
		uiFS: uiFS,
		config: Config{
			Version: "1",
			Project: Project{},
			Tools: []Tool{
				{Name: "code_commenting", Enabled: false, Description: "Adds inline code comments to pull requests"},
				{Name: "docusaurus_sync", Enabled: false, Description: "Syncs code documentation to a Docusaurus site"},
				{Name: "changelog_gen", Enabled: false, Description: "Auto-generates changelog from commit messages"},
			},
			BranchRules: []BranchRule{
				{Branch: "main", Triggers: []string{"push"}, Tools: []string{}},
				{Branch: "develop", Triggers: []string{"push", "pull_request"}, Tools: []string{}},
			},
		},
	}
}

// Start initializes the routes, opens the browser, and starts the HTTP server.
func (s *Server) Start() error {
	mux := http.NewServeMux()

	// Serve static UI files.
	mux.Handle("/", http.FileServer(http.FS(s.uiFS)))

	// API routes.
	mux.HandleFunc("/api/health", s.handleHealth)
	mux.HandleFunc("/api/config", s.handleConfig)
	mux.HandleFunc("/api/config/yaml", s.handleConfigYAML)

	addr := fmt.Sprintf(":%d", s.port)
	url := fmt.Sprintf("http://localhost:%d", s.port)

	// Open the browser after a short delay to let the server start.
	go openBrowser(url)

	fmt.Printf("Dashboard available at %s\n", url)
	return http.ListenAndServe(addr, mux)
}

// handleHealth returns a simple health check response.
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// handleConfig handles GET (read) and POST (update) for the configuration as JSON.
func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.getConfig(w, r)
	case http.MethodPost:
		s.postConfig(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleConfigYAML returns the current configuration as YAML text.
func (s *Server) handleConfigYAML(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	data, err := yaml.Marshal(s.config)
	if err != nil {
		http.Error(w, "Failed to marshal config to YAML", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write(data)
}

// getConfig returns the current configuration as JSON.
func (s *Server) getConfig(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(s.config); err != nil {
		http.Error(w, "Failed to encode config", http.StatusInternalServerError)
	}
}

// postConfig updates the in-memory configuration from the request body.
func (s *Server) postConfig(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var newConfig Config
	if err := json.Unmarshal(body, &newConfig); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	s.mu.Lock()
	s.config = newConfig
	s.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// openBrowser opens the given URL in the default browser.
func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		log.Printf("Warning: could not open browser: %v", err)
	}
}
