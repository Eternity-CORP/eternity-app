#!/usr/bin/env node

/**
 * generate-release-notes.js
 *
 * Automatically generates release notes from git commit history
 * since the last tag.
 *
 * Usage: node scripts/generate-release-notes.js [tag]
 *
 * Options:
 *   tag - Optional git tag to generate notes from (defaults to latest tag)
 *
 * This script:
 * - Finds the latest git tag (or uses provided tag)
 * - Gets all commits since that tag
 * - Parses conventional commit messages
 * - Groups commits by type (feat, fix, chore, etc.)
 * - Outputs formatted markdown
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RELEASE_NOTES_PATH = path.join(__dirname, '..', 'RELEASE_NOTES.md');

// Commit type configuration
const COMMIT_TYPES = {
  feat: { label: '✨ Features', emoji: '✨' },
  fix: { label: '🐛 Bug Fixes', emoji: '🐛' },
  perf: { label: '⚡️ Performance', emoji: '⚡️' },
  refactor: { label: '♻️ Refactoring', emoji: '♻️' },
  docs: { label: '📝 Documentation', emoji: '📝' },
  test: { label: '✅ Tests', emoji: '✅' },
  chore: { label: '🔧 Chores', emoji: '🔧' },
  style: { label: '💄 Styling', emoji: '💄' },
  build: { label: '📦 Build', emoji: '📦' },
  ci: { label: '👷 CI/CD', emoji: '👷' },
  revert: { label: '⏪ Reverts', emoji: '⏪' },
};

function execCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    return '';
  }
}

function getLatestTag() {
  const tag = execCommand('git describe --tags --abbrev=0 2>/dev/null');
  return tag || null;
}

function getCommitsSince(since) {
  const range = since ? `${since}..HEAD` : 'HEAD';
  const commits = execCommand(`git log ${range} --pretty=format:"%H|%s|%b|%an|%ae|%ad" --date=short`);

  if (!commits) {
    return [];
  }

  return commits.split('\n').map(line => {
    const [hash, subject, body, author, email, date] = line.split('|');
    return { hash, subject, body, author, email, date };
  });
}

function parseConventionalCommit(subject) {
  // Parse conventional commit format: type(scope): description
  // Also handle: type: description
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);

  if (match) {
    return {
      type: match[1].toLowerCase(),
      scope: match[2] || null,
      description: match[3],
    };
  }

  // If not conventional format, treat as 'chore'
  return {
    type: 'chore',
    scope: null,
    description: subject,
  };
}

function groupCommitsByType(commits) {
  const grouped = {};

  commits.forEach(commit => {
    const parsed = parseConventionalCommit(commit.subject);
    const type = COMMIT_TYPES[parsed.type] ? parsed.type : 'chore';

    if (!grouped[type]) {
      grouped[type] = [];
    }

    grouped[type].push({
      ...commit,
      ...parsed,
    });
  });

  return grouped;
}

function generateMarkdown(version, groupedCommits, since) {
  const date = new Date().toISOString().split('T')[0];
  let markdown = `# Release Notes - v${version}\n\n`;
  markdown += `**Release Date:** ${date}\n\n`;

  if (since) {
    markdown += `**Changes since:** ${since}\n\n`;
  }

  markdown += `---\n\n`;

  // Output commits grouped by type
  const sortedTypes = Object.keys(COMMIT_TYPES).filter(type => groupedCommits[type]);

  if (sortedTypes.length === 0) {
    markdown += `No commits found.\n\n`;
    return markdown;
  }

  sortedTypes.forEach(type => {
    const commits = groupedCommits[type];
    const { label, emoji } = COMMIT_TYPES[type];

    markdown += `## ${label}\n\n`;

    commits.forEach(commit => {
      const scope = commit.scope ? `**${commit.scope}:** ` : '';
      const shortHash = commit.hash.substring(0, 7);
      markdown += `- ${scope}${commit.description} ([${shortHash}](../../commit/${commit.hash}))\n`;
    });

    markdown += `\n`;
  });

  markdown += `---\n\n`;
  markdown += `**Full Changelog:** `;

  if (since) {
    markdown += `[\`${since}...v${version}\`](../../compare/${since}...v${version})\n`;
  } else {
    markdown += `[All commits](../../commits/v${version})\n`;
  }

  return markdown;
}

function getCurrentVersion() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function main() {
  try {
    console.log('📝 Generating release notes...');

    // Get version
    const version = getCurrentVersion();
    console.log(`   Version: ${version}`);

    // Get latest tag or use provided argument
    const providedTag = process.argv[2];
    const latestTag = providedTag || getLatestTag();

    if (latestTag) {
      console.log(`   Since: ${latestTag}`);
    } else {
      console.log('   Since: Initial commit (no previous tags found)');
    }

    // Get commits
    const commits = getCommitsSince(latestTag);
    console.log(`   Found ${commits.length} commit(s)`);

    if (commits.length === 0) {
      console.log('⚠️  No commits found since last release');
      return;
    }

    // Group commits by type
    const groupedCommits = groupCommitsByType(commits);

    // Generate markdown
    const markdown = generateMarkdown(version, groupedCommits, latestTag);

    // Write to file
    fs.writeFileSync(RELEASE_NOTES_PATH, markdown, 'utf8');

    console.log('✅ Release notes generated successfully!');
    console.log(`   Output: ${RELEASE_NOTES_PATH}`);
    console.log('');

    // Print preview
    console.log('Preview:');
    console.log('─'.repeat(60));
    console.log(markdown);

  } catch (error) {
    console.error('❌ Error generating release notes:', error.message);
    process.exit(1);
  }
}

main();
