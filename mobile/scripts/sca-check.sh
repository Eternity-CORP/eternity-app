#!/bin/bash
#
# SCA (Software Composition Analysis) Security Check Script
# Runs locally to check for vulnerabilities and license compliance
#
# Usage: ./scripts/sca-check.sh [--fix]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FIX_MODE=false
if [ "$1" == "--fix" ]; then
  FIX_MODE=true
fi

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  SCA Security Check${NC}"
echo -e "${BLUE}======================================${NC}"
echo

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm is not installed${NC}"
  exit 1
fi

# Create reports directory
mkdir -p reports/sca

# ============================================
# 1. NPM AUDIT
# ============================================
echo -e "${BLUE}[1/4] Running npm audit...${NC}"

if $FIX_MODE; then
  echo "Running npm audit fix..."
  npm audit fix || true
fi

npm audit --json > reports/sca/npm-audit-report.json || true

CRITICAL=$(cat reports/sca/npm-audit-report.json | jq '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
HIGH=$(cat reports/sca/npm-audit-report.json | jq '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
MODERATE=$(cat reports/sca/npm-audit-report.json | jq '.metadata.vulnerabilities.moderate // 0' 2>/dev/null || echo "0")
LOW=$(cat reports/sca/npm-audit-report.json | jq '.metadata.vulnerabilities.low // 0' 2>/dev/null || echo "0")

echo -e "  Critical: ${RED}$CRITICAL${NC}"
echo -e "  High: ${YELLOW}$HIGH${NC}"
echo -e "  Moderate: $MODERATE"
echo -e "  Low: $LOW"

AUDIT_FAILED=false
if [ "$CRITICAL" -gt 0 ]; then
  echo -e "${RED}❌ CRITICAL vulnerabilities found!${NC}"
  AUDIT_FAILED=true
elif [ "$HIGH" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  HIGH vulnerabilities found${NC}"
  AUDIT_FAILED=true
else
  echo -e "${GREEN}✅ No critical or high vulnerabilities${NC}"
fi

echo

# ============================================
# 2. LICENSE CHECK
# ============================================
echo -e "${BLUE}[2/4] Checking license compliance...${NC}"

# Install license-checker if not present
if ! command -v license-checker &> /dev/null; then
  echo "Installing license-checker..."
  npm install -g license-checker
fi

LICENSE_FAILED=false

# Generate license report
license-checker --json --out reports/sca/license-report.json 2>/dev/null || {
  echo -e "${RED}❌ Failed to generate license report${NC}"
  LICENSE_FAILED=true
}

license-checker --summary > reports/sca/license-summary.txt 2>/dev/null || true

# Check for non-compliant licenses
# Whitelist: MIT, Apache-2.0, BSD*, ISC, CC0-1.0, Unlicense, 0BSD
license-checker --failOn "GPL;AGPL;LGPL;SSPL;CC-BY-SA" --summary 2>/dev/null || {
  echo -e "${RED}❌ Non-compliant licenses found!${NC}"
  echo "Allowed licenses: MIT, Apache-2.0, BSD, ISC, CC0-1.0, Unlicense, 0BSD"
  echo "Blocked licenses: GPL, AGPL, LGPL, SSPL, CC-BY-SA"
  LICENSE_FAILED=true
}

if ! $LICENSE_FAILED; then
  echo -e "${GREEN}✅ All licenses are compliant${NC}"
fi

echo

# ============================================
# 3. GENERATE NOTICE FILE
# ============================================
echo -e "${BLUE}[3/4] Generating NOTICE file...${NC}"

if [ -f reports/sca/license-report.json ]; then
  node -e "
    const fs = require('fs');
    const licenses = JSON.parse(fs.readFileSync('reports/sca/license-report.json', 'utf8'));

    let notice = '# NOTICE\\n\\n';
    notice += 'Eternity Wallet Mobile Application\\n';
    notice += 'Copyright (c) 2025 Eternity Wallet Team\\n\\n';
    notice += 'This product includes software developed by third parties:\\n\\n';

    Object.entries(licenses).forEach(([pkg, info]) => {
      notice += \`## \${pkg}\\n\`;
      notice += \`License: \${info.licenses || 'UNKNOWN'}\\n\`;
      if (info.repository) notice += \`Repository: \${info.repository}\\n\`;
      notice += '\\n';
    });

    fs.writeFileSync('NOTICE.md', notice);
    console.log('✅ NOTICE file generated');
  " || echo -e "${YELLOW}⚠️  Could not generate NOTICE file${NC}"
else
  echo -e "${YELLOW}⚠️  License report not found, skipping NOTICE generation${NC}"
fi

echo

# ============================================
# 4. GENERATE SBOM
# ============================================
echo -e "${BLUE}[4/4] Generating SBOM (Software Bill of Materials)...${NC}"

if ! command -v cyclonedx-npm &> /dev/null; then
  echo "Installing @cyclonedx/cyclonedx-npm..."
  npm install -g @cyclonedx/cyclonedx-npm
fi

cyclonedx-npm --output-file reports/sca/sbom-cyclonedx.json 2>/dev/null || {
  echo -e "${YELLOW}⚠️  SBOM generation failed${NC}"
}

if [ -f reports/sca/sbom-cyclonedx.json ]; then
  echo -e "${GREEN}✅ SBOM generated${NC}"
fi

echo

# ============================================
# SUMMARY
# ============================================
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}======================================${NC}"

cat > reports/sca/summary.txt << EOF
SCA Security Check Summary
==========================
Date: $(date)

NPM Audit:
- Critical: $CRITICAL
- High: $HIGH
- Moderate: $MODERATE
- Low: $LOW

License Compliance:
$(cat reports/sca/license-summary.txt 2>/dev/null || echo "Not available")

Reports generated in: reports/sca/
- npm-audit-report.json
- license-report.json
- license-summary.txt
- sbom-cyclonedx.json
- NOTICE.md

EOF

cat reports/sca/summary.txt

echo
echo -e "${BLUE}Reports saved to: ${NC}reports/sca/"

# Exit with error if any checks failed
if $AUDIT_FAILED || $LICENSE_FAILED; then
  echo
  echo -e "${RED}❌ SCA check FAILED${NC}"
  echo -e "${YELLOW}Run with --fix flag to attempt automatic fixes:${NC}"
  echo -e "  ./scripts/sca-check.sh --fix"
  exit 1
fi

echo
echo -e "${GREEN}✅ All checks passed!${NC}"
exit 0
