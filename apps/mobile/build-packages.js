#!/usr/bin/env node

/**
 * Build workspace packages for EAS Build
 * This script is called from prebuildCommand in eas.json
 * EAS Build wraps commands in "pnpm expo" and adds --platform flag
 * We need to ignore those extra args and find the monorepo root ourselves
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 Building workspace packages...');

// Find monorepo root by looking for pnpm-workspace.yaml
let monorepoRoot = process.cwd();

// Try going up directories to find pnpm-workspace.yaml
for (let i = 0; i < 5; i++) {
  const workspaceFile = path.join(monorepoRoot, 'pnpm-workspace.yaml');
  if (fs.existsSync(workspaceFile)) {
    break;
  }
  const parent = path.dirname(monorepoRoot);
  if (parent === monorepoRoot) {
    // Reached filesystem root
    console.error('❌ Error: pnpm-workspace.yaml not found');
    process.exit(1);
  }
  monorepoRoot = parent;
}

console.log(`📁 Current directory: ${process.cwd()}`);
console.log(`📁 Monorepo root: ${monorepoRoot}`);

// Change to monorepo root
process.chdir(monorepoRoot);
console.log(`📁 Changed to: ${process.cwd()}`);

// Verify we're in the right place
if (!fs.existsSync('pnpm-workspace.yaml')) {
  console.error('❌ Error: pnpm-workspace.yaml not found. Current directory:', process.cwd());
  process.exit(1);
}

// Verify pnpm is available
try {
  execSync('pnpm --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Error: pnpm not found. Please ensure pnpm is installed.');
  process.exit(1);
}

// Build packages
console.log('📦 Building @e-y/shared...');
try {
  execSync('pnpm --filter @e-y/shared build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to build @e-y/shared');
  process.exit(1);
}

console.log('📦 Building @e-y/crypto...');
try {
  execSync('pnpm --filter @e-y/crypto build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to build @e-y/crypto');
  process.exit(1);
}

console.log('✅ All packages built successfully');
