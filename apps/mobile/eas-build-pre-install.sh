#!/bin/bash
set -e

# EAS Build pre-install hook for monorepo
# This script runs before dependency installation

echo "🔧 Setting up pnpm for monorepo..."

# Enable corepack
corepack enable

# Prepare and activate pnpm
corepack prepare pnpm@8.15.0 --activate

# Verify pnpm is available
pnpm --version

echo "✅ pnpm setup complete"
