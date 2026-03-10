# ==============================================================================
# Puck Installation Script (Windows PowerShell)
# Downloads and runs the Puck Hub binary to configure the current repository.
# ==============================================================================

$REPO = "ajthr/puck"
$VERSION = "latest"

$ARCH = $Env:PROCESSOR_ARCHITECTURE.ToLower()
if ($ARCH -eq "amd64") {
    $ARCH = "amd64"
} elseif ($ARCH -eq "arm64") {
    $ARCH = "arm64"
} else {
    Write-Error "Unsupported architecture: $ARCH"
    exit 1
}

if ($VERSION -eq "latest") {
    $URL = "https://github.com/${REPO}/releases/latest/download/puck-windows-${ARCH}.exe"
} else {
    $URL = "https://github.com/${REPO}/releases/download/${VERSION}/puck-windows-${ARCH}.exe"
}

$TMP_BINARY = Join-Path $PSScriptRoot "puck_hub.exe"

Write-Host "Downloading Puck Hub for windows-${ARCH}..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $URL -OutFile $TMP_BINARY

Write-Host "Starting Puck Dashboard..." -ForegroundColor Cyan
& $TMP_BINARY --dir "."

Remove-Item $TMP_BINARY
