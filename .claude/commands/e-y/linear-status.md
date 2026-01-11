---
name: ey-linear-status
description: Show Linear project status and current sprint progress
---

# E-Y Linear Status Command

Display current Linear status: active issues, sprint progress, blockers.

## Usage

```
/ey-linear-status [project|my|all]
```

- No args or `all` — Show overview of all projects
- `my` — Show issues assigned to me
- `project` — Show specific project (e.g., `/ey-linear-status Phase 1`)

## Execution Steps

### 1. Fetch Data

**For "all" or no args:**
```
mcp__linear__list_projects({ includeArchived: false })
mcp__linear__list_issues({ team: "E-y", state: "In Progress", limit: 20 })
mcp__linear__list_issues({ team: "E-y", state: "Todo", limit: 20 })
```

**For "my":**
```
mcp__linear__list_issues({ team: "E-y", assignee: "me" })
```

**For specific project:**
```
mcp__linear__list_issues({ team: "E-y", project: "<project-name>" })
```

### 2. Display Format

#### All Projects Overview

```markdown
## E-Y Linear Status

### Active Projects

| Project | Status | Progress | In Progress | Todo |
|---------|--------|----------|-------------|------|
| Phase 1: Core Wallet | Backlog | 0/10 | 2 | 8 |
| Phase 2: BLIK System | Backlog | 0/8 | 0 | 8 |
| Phase 3: Identity & Polish | Backlog | 0/6 | 0 | 6 |
| Phase 4: Feature Overlays | Backlog | 0/3 | 0 | 3 |

### Currently In Progress (2)

- **E-6** FR-1.1: Create wallet — @eternaki
- **E-11** FR-2.1: Send to address — @eternaki

### Up Next (Priority: Must)

- E-7: FR-1.2: Import wallet
- E-9: FR-1.4: View balances
- E-10: FR-1.5: Transaction history

### Stats

- Total Issues: 27
- Done: 0 (0%)
- In Progress: 2 (7%)
- Todo: 25 (93%)
```

#### My Issues

```markdown
## My Issues

### In Progress (2)
- **E-6** FR-1.1: Create wallet — Phase 1
- **E-11** FR-2.1: Send to address — Phase 1

### Todo (5)
- **E-7** FR-1.2: Import wallet — Must
- **E-9** FR-1.4: View balances — Must
...

### Recently Completed (3)
- E-XX: ... — 2 hours ago
```

#### Project View

```markdown
## Phase 1: Core Wallet

Status: Backlog
Progress: 2/10 (20%)

### Done (2)
- [x] E-6: FR-1.1: Create wallet
- [x] E-7: FR-1.2: Import wallet

### In Progress (1)
- [ ] E-9: FR-1.4: View balances — @eternaki

### Todo (7)
- [ ] E-8: FR-1.3: Multi-account (Should)
- [ ] E-10: FR-1.5: Transaction history (Must)
- [ ] E-11: FR-2.1: Send to address (Must)
...
```

### 3. Suggest Next Action

Based on status, suggest:

- If no In Progress: "Start working on E-XX?"
- If In Progress stuck: "E-XX has been in progress for 3 days. Need help?"
- If project complete: "Phase 1 complete! Ready for Phase 2?"

## Quick Actions

After showing status, offer:
```
Quick actions:
1. Start next issue (E-XX)
2. Mark E-XX as done
3. Create new issue
4. Show project details
```
