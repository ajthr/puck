# Puck

Puck is a repository helper bot designed to handle the "boring stuff" so you don't have to.

Puck uses a Go-based local initializer to set up your repository via a web dashboard and a Python-based engine to execute intelligent automation via GitHub Actions.

## Architecture

Puck is built on a "Hub-and-Spoke" model:

**Hub (Go Core):** A local CLI tool that launches a temporary web server to help you configure your repository standards visually.

**Spoke (Python Engine):** A modular, remote engine that runs in your target repositories via GitHub Actions, executing specific "tools" based on your branch logic.

See [docs/architecture.md](docs/architecture.md) for a detailed breakdown.

## Project Structure

```
puck/
├── config/
│   ├── base.yaml                # Shared config schema (tools, branch rules)
│   └── stubs/
│       └── default.yaml         # Default stub with sensible preset values
├── core/
│   ├── server/
│   │   └── server.go            # HTTP server (API + static file serving)
│   └── ui/
│       ├── index.html           # Web dashboard
│       └── index.css            # Dashboard styles
├── docs/                        # Project documentation
│   ├── architecture.md
│   └── configuration.md
├── lib/
│   ├── __init__.py
│   ├── main.py
│   └── tools/
│       └── <tool_name>/
│           ├── __init__.py
│           └── main.py
├── scripts/
│   └── install.sh
├── main.go                      # CLI entry point
├── go.mod
├── go.sum
├── LICENSE
└── README.md
```

## Development

### Prerequisites

- Go 1.25.5 or later

### Running Locally

```bash
go run main.go --port 8080 --dir .
```

This will start the Puck server and open the configuration dashboard in your browser at `http://localhost:8080`.

### CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `8080` | Port to run the server on |
| `--dir` | `.` | Target repository directory |

### Building

```bash
go build -o puck .
```

## Initialization (End Users)

```bash
curl -sSL https://raw.githubusercontent.com/ajthr/puck/main/scripts/install.sh | bash
```

This will launch a local web dashboard in your browser where you can:
- Enable specific tools (Code Commenting, Docusaurus Sync, etc.).
- Define branch-specific execution rules.
- Generate the configuration and GitHub Actions workflow for your repository.

## Configuration

Puck uses YAML configuration files to define which tools run on which branches. See [docs/configuration.md](docs/configuration.md) for the full schema reference.

## License

Copyright 2026 Ajith. Distributed under the Apache 2.0 License.
