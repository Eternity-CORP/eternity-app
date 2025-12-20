#!/usr/bin/env npx ts-node

/**
 * Documentation Consistency Checker
 * 
 * Validates that:
 * 1. All files referenced in stories actually exist
 * 2. Stories referenced in epics exist
 * 3. TRACEABILITY.md is up to date
 * 
 * Run: npm run docs:check
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const STORIES_DIR = path.join(DOCS_DIR, 'stories');
const PRD_DIR = path.join(DOCS_DIR, 'prd');

interface ValidationResult {
  file: string;
  issues: string[];
  warnings: string[];
}

const results: ValidationResult[] = [];

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

/**
 * Extract file paths from markdown content
 * Matches patterns like `backend/src/...` or "mobile/src/..."
 * Excludes paths in "Файлы для создания" section
 */
function extractFilePaths(content: string, excludeToCreate: boolean = true): string[] {
  const patterns = [
    /`(backend\/[^`]+)`/g,
    /`(mobile\/[^`]+)`/g,
    /`(shared\/[^`]+)`/g,
    /`(scripts\/[^`]+)`/g,
  ];
  
  // Remove "Files to create" section if needed
  let searchContent = content;
  if (excludeToCreate) {
    // Remove content between "## Файлы для создания" and next "##" or end
    searchContent = content.replace(/## Файлы для создания[\s\S]*?(?=##|$)/g, '');
  }
  
  const paths: string[] = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(searchContent)) !== null) {
      paths.push(match[1]);
    }
  }
  return [...new Set(paths)];
}

/**
 * Extract story IDs from epic content
 * Matches patterns like S-01, S-02, etc.
 */
function extractStoryIds(content: string): string[] {
  const pattern = /S-(\d+)/g;
  const ids: string[] = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    ids.push(`S-${match[1].padStart(2, '0')}`);
  }
  return [...new Set(ids)];
}

/**
 * Check if a file exists relative to project root
 */
function fileExists(relativePath: string): boolean {
  const fullPath = path.join(ROOT_DIR, relativePath);
  return fs.existsSync(fullPath);
}

/**
 * Validate a single story file
 */
function validateStory(storyPath: string): ValidationResult {
  const result: ValidationResult = {
    file: path.relative(ROOT_DIR, storyPath),
    issues: [],
    warnings: [],
  };

  const content = fs.readFileSync(storyPath, 'utf-8');
  const referencedFiles = extractFilePaths(content);

  for (const filePath of referencedFiles) {
    if (!fileExists(filePath)) {
      result.issues.push(`Referenced file does not exist: ${filePath}`);
    }
  }

  // Check for required sections
  if (!content.includes('## Acceptance Criteria') && !content.includes('## Задача')) {
    result.warnings.push('Missing Acceptance Criteria section');
  }

  // Check for Epic reference
  if (!content.includes('**Epic:**')) {
    result.warnings.push('Missing Epic reference');
  }

  return result;
}

/**
 * Validate an epic file
 */
function validateEpic(epicPath: string): ValidationResult {
  const result: ValidationResult = {
    file: path.relative(ROOT_DIR, epicPath),
    issues: [],
    warnings: [],
  };

  const content = fs.readFileSync(epicPath, 'utf-8');
  const storyIds = extractStoryIds(content);

  for (const storyId of storyIds) {
    const storyFiles = fs.readdirSync(STORIES_DIR)
      .filter(f => f.startsWith(storyId));
    
    if (storyFiles.length === 0) {
      result.issues.push(`Referenced story does not exist: ${storyId}`);
    }
  }

  return result;
}

/**
 * Validate TRACEABILITY.md
 */
function validateTraceability(): ValidationResult {
  const traceabilityPath = path.join(DOCS_DIR, 'TRACEABILITY.md');
  const result: ValidationResult = {
    file: 'docs/TRACEABILITY.md',
    issues: [],
    warnings: [],
  };

  if (!fs.existsSync(traceabilityPath)) {
    result.issues.push('TRACEABILITY.md does not exist!');
    return result;
  }

  const content = fs.readFileSync(traceabilityPath, 'utf-8');
  const referencedFiles = extractFilePaths(content);

  // Check that all referenced files exist
  for (const filePath of referencedFiles) {
    if (!fileExists(filePath)) {
      result.warnings.push(`Traceability references non-existent file: ${filePath}`);
    }
  }

  // Check that all stories are listed
  const storyFiles = fs.readdirSync(STORIES_DIR).filter(f => f.endsWith('.md'));
  for (const storyFile of storyFiles) {
    const storyId = storyFile.split('-')[0] + '-' + storyFile.split('-')[1];
    if (!content.includes(storyId)) {
      result.warnings.push(`Story ${storyId} not found in traceability matrix`);
    }
  }

  return result;
}

/**
 * Main validation runner
 */
function main() {
  console.log('\n📋 Documentation Consistency Check\n');
  console.log('='.repeat(50));

  // Validate stories
  console.log('\n📖 Checking Stories...\n');
  const storyFiles = fs.readdirSync(STORIES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(STORIES_DIR, f));

  for (const storyFile of storyFiles) {
    results.push(validateStory(storyFile));
  }

  // Validate epics
  console.log('🎯 Checking Epics...\n');
  const epicFiles = fs.readdirSync(PRD_DIR)
    .filter(f => f.startsWith('epic-') && f.endsWith('.md'))
    .map(f => path.join(PRD_DIR, f));

  for (const epicFile of epicFiles) {
    results.push(validateEpic(epicFile));
  }

  // Validate traceability
  console.log('🔗 Checking Traceability...\n');
  results.push(validateTraceability());

  // Output results
  let hasIssues = false;
  let hasWarnings = false;

  for (const result of results) {
    if (result.issues.length > 0 || result.warnings.length > 0) {
      console.log(`\n📄 ${result.file}`);
      
      for (const issue of result.issues) {
        console.log(`  ${RED}❌ ERROR: ${issue}${RESET}`);
        hasIssues = true;
      }
      
      for (const warning of result.warnings) {
        console.log(`  ${YELLOW}⚠️  WARN: ${warning}${RESET}`);
        hasWarnings = true;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  
  if (!hasIssues && !hasWarnings) {
    console.log(`${GREEN}✅ All documentation is consistent!${RESET}\n`);
    process.exit(0);
  } else if (hasIssues) {
    console.log(`${RED}❌ Found consistency issues. Please fix before committing.${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`${YELLOW}⚠️  Found warnings. Consider reviewing.${RESET}\n`);
    process.exit(0);
  }
}

main();
