#!/bin/bash

# ==============================================================================
# Puck Installation Script (Linux/macOS)
# Downloads and runs the Puck Hub binary to configure the current repository.
# ==============================================================================

set -e

REPO="ajthr/puck"
VERSION="latest"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case $ARCH in
    x86_64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

case $OS in
    linux) OS="linux" ;;
    darwin) OS="darwin" ;;
    *) echo "Unsupported OS: $OS. For Windows, use install.ps1"; exit 1 ;;
esac

if [ "$VERSION" = "latest" ]; then
    URL="https://github.com/${REPO}/releases/latest/download/puck-${OS}-${ARCH}"
else
    URL="https://github.com/${REPO}/releases/download/${VERSION}/puck-${OS}-${ARCH}"
fi

TMP_BINARY="puck_hub"

echo "Downloading Puck Hub for ${OS}-${ARCH}..."
curl -sSL -o "$TMP_BINARY" "$URL"
chmod +x "$TMP_BINARY"
echo "Starting Puck Dashboard..."
./"$TMP_BINARY" --dir "."

rm "$TMP_BINARY"
