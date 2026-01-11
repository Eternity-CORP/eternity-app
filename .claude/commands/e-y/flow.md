---
name: ey-flow
description: Full development workflow orchestrator - from Linear task to done
---

# E-Y Flow Command

Complete development workflow orchestrator. Takes you from selecting a Linear task to marking it done, with confirmations at each step.

## Usage

```
/ey-flow              # Start fresh - select task from backlog
/ey-flow E-7          # Start with specific task
/ey-flow resume       # Continue where you left off
```

## Flow Steps

```
┌─────────────────────────────────────────┐
│  1. SELECT    → Pick task from Linear   │
│  2. START     → Create branch           │
│  3. PLAN      → Show plan and AC        │
│  4. CODE      → Write code              │
│  5. VERIFY    → Test on device          │
│  6. CHECK     → Lint, types, tests      │
│  7. COMMIT    → Commit changes          │
│  8. PUSH      → Push to remote          │
│  9. DONE      → Close Linear issue      │
│  10. NEXT     → Suggest next task       │
└─────────────────────────────────────────┘
```

## Progress Display

Show current progress during flow:
```
┌────────────────────────────────┐
│ E-7: Import wallet from seed   │
│ ████████░░░░░░░░ Step 5/10     │
│ [SELECT ✓] [START ✓] [PLAN ✓]  │
│ [CODE ✓] [VERIFY ●] [CHECK ○]  │
│ [COMMIT ○] [PUSH ○] [DONE ○]   │
└────────────────────────────────┘
```

Legend: ✓ = done, ● = current, ○ = pending

---

## Step Details

### Step 1: SELECT

**If no task ID provided:**
```
mcp__linear__list_issues({
  team: "E-y",
  state: "Todo",
  limit: 20
})
```

Group by project and priority:
```
Select task to work on:

Phase 1: Core Wallet (Must)
1. E-7: FR-1.2: Import wallet from seed phrase
2. E-9: FR-1.4: View token balances

Phase 2: BLIK System (Must)
3. E-20: FR-4.1: Generate BLIK code
...

Enter number or issue ID:
```

**Confirmation:** "Selected E-7. Continue to START?"

---

### Step 2: START

```
mcp__linear__get_issue({ id: "<issue-id>" })
```

Display issue details:
- Title and description
- Labels (priority, module)
- Acceptance criteria

Ask about branch:
```
Create git branch?
Suggested: e-7-import-wallet-from-seed-phrase
(yes / no / custom name)
```

If yes:
```bash
git checkout -b e-7-import-wallet-from-seed-phrase
```

Update Linear:
```
mcp__linear__update_issue({
  id: "<issue-id>",
  state: "In Progress",
  assignee: "me"
})
```

**Confirmation:** "Branch created, status updated. Continue to PLAN?"

---

### Step 3: PLAN

Show acceptance criteria as checklist:
```
## Acceptance Criteria for E-7

- [ ] Accept 12 or 24 word mnemonic input
- [ ] Validate mnemonic checksum before import
- [ ] Clear error message for invalid phrases
- [ ] Derive wallet and store securely
- [ ] Show success confirmation with address
```

Generate implementation plan:
```
## Implementation Plan

1. Create ImportWalletScreen component
2. Add mnemonic input with word count detection
3. Implement validation using ethers.js isValidMnemonic()
4. On valid: derive wallet with Wallet.fromPhrase()
5. Store in secure storage
6. Navigate to success screen

Files to create/modify:
- apps/mobile/app/onboarding/import-wallet.tsx (new)
- apps/mobile/src/services/wallet-service.ts (modify)
```

**Confirmation:** "Plan clear? Start coding?"

---

### Step 4: CODE

Write code according to plan. After each logical block:
```
✓ Created ImportWalletScreen component
✓ Added mnemonic input field

Continue with validation logic?
```

When code is complete:
```
## Code Complete

Files changed:
- apps/mobile/app/onboarding/import-wallet.tsx (+120 lines)
- apps/mobile/src/services/wallet-service.ts (+45 lines)

Ready to verify on device?
```

**Confirmation:** "Code written. Continue to VERIFY?"

---

### Step 5: VERIFY

Check if dev server is running. If not:
```
Dev server not detected. Starting...
```
Run: `cd apps/mobile && npx expo start --clear`

Show verification checklist from acceptance criteria:
```
## Verify on Device

Check each item on your device/emulator:

□ 1. Accept 12 or 24 word mnemonic input
     → Try entering 12 words, then 24 words
     Verified? (yes/no)

□ 2. Validate mnemonic checksum before import
     → Try invalid phrase, should show error
     Verified? (yes/no)

□ 3. Clear error message for invalid phrases
     → Check error message is helpful
     Verified? (yes/no)

□ 4. Derive wallet and store securely
     → Import valid phrase, check wallet created
     Verified? (yes/no)

□ 5. Show success confirmation with address
     → Verify address is displayed correctly
     Verified? (yes/no)
```

Wait for each confirmation. Track progress:
```
Verification: ✓✓✓○○ (3/5)
```

**Confirmation:** "All verified! Continue to CHECK?"

---

### Step 6: CHECK

Run quality checks sequentially:

```bash
# 1. Lint
pnpm lint
```
If errors → offer to fix automatically or manually

```bash
# 2. Type check
pnpm typecheck
```
If errors → show errors, offer to fix

```bash
# 3. Tests (if applicable)
pnpm test
```
If failures → show failures, offer to fix

Show summary:
```
## Quality Checks

✓ Lint: passed
✓ Types: passed
✓ Tests: 12 passed, 0 failed

All checks green!
```

**Confirmation:** "Checks passed. Continue to COMMIT?"

---

### Step 7: COMMIT

Show changes:
```bash
git diff --stat
```

```
## Changes to Commit

 apps/mobile/app/onboarding/import-wallet.tsx | 120 +++
 apps/mobile/src/services/wallet-service.ts   |  45 ++
 2 files changed, 165 insertions(+)
```

Propose commit message:
```
Suggested commit message:

feat(wallet): E-7 import wallet from seed phrase

- Add ImportWalletScreen with mnemonic input
- Validate 12/24 word phrases with checksum
- Store derived wallet in secure storage
- Show success confirmation with address

Use this message? (yes / no / edit)
```

Execute commit:
```bash
git add -A
git commit -m "<message>"
```

**Confirmation:** "Committed. Continue to PUSH?"

---

### Step 8: PUSH

Check branch status:
```bash
git fetch origin
git status
```

If behind remote:
```
Branch is behind origin. Rebase first?
(yes / no / skip push)
```

Push:
```bash
git push origin <branch-name>
```

Show result:
```
## Pushed

Branch: e-7-import-wallet-from-seed-phrase
Commits: 1 new commit
Remote: origin

View on GitHub: <url>
```

**Confirmation:** "Pushed. Close task in Linear?"

---

### Step 9: DONE

Update Linear status:
```
mcp__linear__update_issue({
  id: "<issue-id>",
  state: "Done"
})
```

Optional completion comment:
```
Add completion summary to Linear? (yes/no)
```

If yes:
```
mcp__linear__create_comment({
  issueId: "<issue-id>",
  body: "Completed: Implemented wallet import with mnemonic validation and secure storage."
})
```

Show confirmation:
```
## Task Complete!

✓ E-7: Import wallet from seed phrase
  Status: Done
  Branch: e-7-import-wallet-from-seed-phrase
  Commits: 1
```

**Confirmation:** "Task done! Check next task?"

---

### Step 10: NEXT

Find next task from same project:
```
mcp__linear__list_issues({
  team: "E-y",
  state: "Todo",
  project: "<same-project>",
  limit: 5
})
```

Show suggestion:
```
## Next Task

From "Phase 1: Core Wallet":
→ E-9: FR-1.4: View token balances with USD

Start this task? (yes / no / pick different)
```

If yes → go to Step 2 (START) with new task
If no → end flow

```
## Flow Complete

Session summary:
- Tasks completed: 1
- Commits: 1
- Time: ~45 min

Great work! Run /ey-flow to start another task.
```

---

## Flow Control

User can say at any step:

| Command | Action |
|---------|--------|
| `stop` / `pause` | Save progress, show current state |
| `skip` | Skip current step, go to next |
| `back` | Return to previous step |
| `status` | Show progress bar |
| `abort` | Cancel flow entirely |

### Resume Flow

```
/ey-flow resume
```

Detection logic:
1. Check current git branch for `e-XX-*` pattern
2. Look up issue in Linear
3. Determine step based on:
   - Branch exists? → past START
   - Code changes? → past CODE
   - Commits? → past COMMIT
   - Pushed? → past PUSH
4. Offer to continue from detected step

```
## Resume Flow

Detected: E-7 (Import wallet from seed phrase)
Branch: e-7-import-wallet-from-seed-phrase
Status: Code written, not committed

Resume from step 6 (CHECK)? (yes/no)
```

---

## Example Session

```
User: /ey-flow

Claude:
┌────────────────────────────────┐
│ E-Y Flow                       │
│ ○○○○○○○○○○ Step 1/10           │
│ [SELECT ●]                     │
└────────────────────────────────┘

Select task to work on:

Phase 1: Core Wallet (Must)
1. E-7: FR-1.2: Import wallet from seed phrase
2. E-9: FR-1.4: View token balances

Enter number:

User: 1

Claude:
┌────────────────────────────────┐
│ E-7: Import wallet from seed   │
│ ██░░░░░░░░░░░░░░ Step 2/10     │
│ [SELECT ✓] [START ●]           │
└────────────────────────────────┘

## E-7: Import wallet from seed phrase

**Description:** Allow users to import existing wallet...

**Acceptance Criteria:**
- Accept 12 or 24 word mnemonic input
- Validate mnemonic checksum
...

Create branch e-7-import-wallet-from-seed-phrase? (yes/no)

User: yes

Claude: ✓ Branch created
        ✓ Linear status → In Progress

Continue to PLAN? (yes/no)

...flow continues...
```
