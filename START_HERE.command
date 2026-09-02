#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18 or newer is required. Download it from https://nodejs.org/"
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies for the first launch..."
  npm install
fi

echo "Opening FigureLabel at http://127.0.0.1:4173/"
echo "Keep this window open while annotating. Press Ctrl+C to stop."
npm start
