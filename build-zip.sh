#!/usr/bin/env bash
set -euo pipefail

# Build script for NIX UTC & World Time Chrome Extension
# Creates a versioned zip in ./dist/ based on manifest.json.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Delegating to build.py to avoid stdin pipe issues on Windows
python3 build.py
