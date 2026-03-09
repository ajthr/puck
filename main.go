package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"os"

	"github.com/ajthr/puck/core/server"
)

//go:embed core/ui
var uiFiles embed.FS

func main() {
	port := flag.Int("port", 8080, "Port to run the server on")
	dir := flag.String("dir", ".", "Target repository directory")
	flag.Parse()

	// Resolve the target directory to an absolute path.
	absDir, err := resolveDir(*dir)
	if err != nil {
		log.Fatalf("Error: failed to resolve directory %q: %v", *dir, err)
	}

	// Strip the "core/ui" prefix so files are served from root.
	uiFS, err := fs.Sub(uiFiles, "core/ui")
	if err != nil {
		log.Fatalf("Error: failed to load embedded UI files: %v", err)
	}

	fmt.Printf("Puck server starting on port %d\n", *port)
	fmt.Printf("Target directory: %s\n", absDir)

	srv := server.New(*port, absDir, uiFS)
	if err := srv.Start(); err != nil {
		log.Fatalf("Error: server failed to start: %v", err)
	}
}

func resolveDir(dir string) (string, error) {
	if dir == "." {
		return os.Getwd()
	}
	info, err := os.Stat(dir)
	if err != nil {
		return "", fmt.Errorf("directory does not exist: %w", err)
	}
	if !info.IsDir() {
		return "", fmt.Errorf("%q is not a directory", dir)
	}
	// Check if it is already an absolute path.
	if dir[0] == '/' || dir[0] == '\\' || (len(dir) > 1 && dir[1] == ':') {
		return dir, nil
	}
	abs, err := os.Getwd()
	if err != nil {
		return "", err
	}
	return abs + string(os.PathSeparator) + dir, nil
}
