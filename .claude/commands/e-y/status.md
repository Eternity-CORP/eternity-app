---
name: ey-status
description: Show project status - builds, dependencies, and sprint progress
---

# E-Y Status Command

Show comprehensive project status.

## Process

1. Check EAS build status
2. Check dependencies status
3. Show sprint progress
4. List recent changes

## Commands to Run

### EAS Builds
```bash
cd "/Users/daniillogachev/Ma project/E-Y/apps/mobile"
eas build:list --limit 5
```

### Dependencies Check
```bash
cd "/Users/daniillogachev/Ma project/E-Y"
pnpm outdated 2>/dev/null || echo "All up to date"
```

### TypeScript Check
```bash
cd "/Users/daniillogachev/Ma project/E-Y/apps/mobile"
npx tsc --noEmit
```

## Sprint Status

Read and display: `docs/v1.0/sprint-status.yaml`

## Output Format

```
E-Y Project Status
━━━━━━━━━━━━━━━━━━

📱 Latest Builds:
   iOS: [status] - [date]
   Android: [status] - [date]

📦 Dependencies: [ok/outdated]

✅ TypeScript: [pass/fail]

📊 Sprint Progress:
   Completed: X/21 stories
   Current: Story X.X
```
