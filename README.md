# Puck

Puck is a repository helper bot designed to handle the "boring stuff" so you don't have to.

Puck uses a Go-based local initializer to set up your repository via a web dashboard and a Python-based engine to execute intelligent automation via GitHub Actions.

# Architecture

Puck is built on a "Hub-and-Spoke" model:

The Hub (Go Core): A local CLI tool that launches a temporary web server to help you configure your repository standards visually.

The Spoke (Python Engine): A modular, remote engine that runs in your target repositories via GitHub Actions, executing specific "tools" based on your branch logic.

# Project Structure

```
puck/
├── config/
│   └── base.yaml
├── core/
│   ├── server/
│   │   └── server.go
│   └── ui/
│       └── index.html
│       └── index.css
├── lib/
│   ├── __init__.py
│   ├── main.py
│   ├── tools/
│   |   ├── __init__.py
│   │   └── <tool_name>/
│   │       ├── __init__.py
│   │       └── main.py
├── scripts/
│   └── install.sh
├── go.mod
├── go.sum
├── LICENSE
└── README.md
```

# Initialization

curl -sSL https://raw.githubusercontent.com/ajthr/puck/main/scripts/install.sh | bash

This will launch a local web dashboard in your browser where you can:
- Select your project type (AOSP, Java, Python, etc.).
- Enable specific tools (Code Commenting, Docusaurus Sync).
- Define branch-specific execution rules.

# License

Copyright © 2026 Ajith. Distributed under the Apache 2.0 License.
