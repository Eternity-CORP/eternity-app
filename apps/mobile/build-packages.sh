#!/bin/sh
set -e

# Build workspace packages for EAS Build
# This script is called from prebuildCommand in eas.json
# EAS Build wraps commands in "pnpm expo" and adds --platform flag
# We need to ignore those extra args and find the monorepo root ourselves

echo "🔧 Building workspace packages..."

# Find monorepo root by looking for pnpm-workspace.yaml
# Start from current directory (which should be apps/mobile or root)
CURRENT_DIR="$(pwd)"
MONOREPO_ROOT="$CURRENT_DIR"

# If we're in apps/mobile, go up two levels
if [ -f "package.json" ] && [ -d "../.." ]; then
  if [ -f "../../pnpm-workspace.yaml" ]; then
    MONOREPO_ROOT="$(cd ../.. && pwd)"
  fi
fi

# If we're already at root, check for pnpm-workspace.yaml
if [ -f "pnpm-workspace.yaml" ]; then
  MONOREPO_ROOT="$(pwd)"
fi

# If still not found, try to find it by going up directories
if [ ! -f "$MONOREPO_ROOT/pnpm-workspace.yaml" ]; then
  # Try going up from current directory
  for i in 1 2 3 4; do
    UP_DIR=$(eval "cd $(printf '../%.0s' {1..$i}) && pwd" 2>/dev/null || echo "")
    if [ -n "$UP_DIR" ] && [ -f "$UP_DIR/pnpm-workspace.yaml" ]; then
      MONOREPO_ROOT="$UP_DIR"
      break
    fi
  done
fi

echo "📁 Current directory: $(pwd)"
echo "📁 Monorepo root: $MONOREPO_ROOT"

# Change to monorepo root
cd "$MONOREPO_ROOT"
echo "📁 Changed to: $(pwd)"

# Verify we're in the right place
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "❌ Error: pnpm-workspace.yaml not found. Current directory: $(pwd)"
  ls -la
  exit 1
fi

# Verify pnpm is available
if ! command -v pnpm &> /dev/null; then
  echo "❌ Error: pnpm not found. Please ensure pnpm is installed."
  exit 1
fi

echo "📦 Building @e-y/shared..."
pnpm --filter @e-y/shared build || {
  echo "❌ Failed to build @e-y/shared"
  exit 1
}

echo "📦 Building @e-y/crypto..."
pnpm --filter @e-y/crypto build || {
  echo "❌ Failed to build @e-y/crypto"
  exit 1
}

echo "✅ All packages built successfully"
