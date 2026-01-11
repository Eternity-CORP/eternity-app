---
name: ey-linear-start
description: Start working on a Linear issue (move to In Progress)
---

# E-Y Linear Start Command

Start working on a Linear issue: move to In Progress, assign to you, create git branch.

## Usage

```
/ey-linear-start [issue-id]
```

If no issue ID provided, will show Todo issues to select from.

## Execution Steps

### 1. Select Issue

**If no issue ID provided:**
```
mcp__linear__list_issues({
  team: "E-y",
  state: "Todo",
  limit: 15
})
```

Group by project and priority, show:
```
Select issue to start:

Phase 1: Core Wallet (Must have for MVP)
1. E-7: FR-1.2: Import wallet from seed phrase
2. E-9: FR-1.4: View token balances with USD
3. E-10: FR-1.5: Transaction history

Phase 2: BLIK System
4. E-20: FR-4.1: Generate unique 6-digit BLIK code
...
```

### 2. Get Issue Details

```
mcp__linear__get_issue({ id: "<issue-id>" })
```

Display:
- Title and description
- Acceptance criteria
- Labels (priority, module, layer)
- Related issues (blocking/blocked by)

### 3. Update Issue Status

```
mcp__linear__update_issue({
  id: "<issue-id>",
  state: "In Progress",
  assignee: "me"
})
```

### 4. Create Git Branch (Optional)

Ask user:
```
Create git branch for this issue?
Suggested: eternaki/e-XX-<issue-slug>
(yes/no/custom name)
```

If yes:
```bash
git checkout -b eternaki/e-XX-<issue-slug>
```

### 5. Show Summary

```markdown
## Started: E-XX

**Title:** FR-1.2: Import wallet from seed phrase
**Project:** Phase 1: Core Wallet
**Priority:** Must

### Acceptance Criteria
- [ ] Accept 12 or 24 word mnemonic input
- [ ] Validate mnemonic checksum before import
- [ ] Clear error message for invalid phrases
- [ ] Derive wallet and store securely
- [ ] Show success confirmation with address

### Technical Notes
- Use ethers.js `Wallet.fromPhrase()`
- Validate with `isValidMnemonic()`

### Branch
`eternaki/e-7-fr-12-import-wallet-from-seed-phrase`

---
When done, run `/ey-linear-done E-7`
```

## Example Flow

```
User: /ey-linear-start

Claude: Select issue to start:

Phase 1: Core Wallet (Must)
1. E-7: FR-1.2: Import wallet from seed phrase
2. E-9: FR-1.4: View token balances

Phase 2: BLIK System (Must)
3. E-25: BLIK Backend Infrastructure

User: 1

Claude: Starting E-7: FR-1.2: Import wallet from seed phrase

Status updated to: In Progress
Assigned to: you

Create git branch?
Suggested: eternaki/e-7-fr-12-import-wallet-from-seed-phrase
(yes/no)

User: yes

Claude: Branch created and checked out.

## E-7: Import wallet from seed phrase

Acceptance Criteria:
- [ ] Accept 12 or 24 word mnemonic input
- [ ] Validate mnemonic checksum
- [ ] Derive wallet and store securely
...

Ready to implement! When done: /ey-linear-done E-7
```
