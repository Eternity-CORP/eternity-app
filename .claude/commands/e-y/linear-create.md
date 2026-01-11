---
name: ey-linear-create
description: Create new Linear issue with project/epic selection
---

# E-Y Linear Create Command

Create a new Linear issue with interactive project and priority selection.

## Usage

```
/ey-linear-create [title]
```

## Execution Steps

### Step 1: Gather Information

Ask user for missing information using `AskUserQuestion`:

**Question 1: Project/Phase**
```
Which project is this for?
- Phase 1: Core Wallet (wallet, balances, basic send)
- Phase 2: BLIK System (codes, real-time matching)
- Phase 3: Identity & Polish (@username, UI polish)
- Phase 4: Feature Overlays (contacts, scheduled, split)
```

**Question 2: Issue Type**
```
What type of issue?
- Feature — New functionality from PRD
- Bug — Something broken
- Improvement — Enhancement to existing feature
- Tech Debt — Refactoring, cleanup
```

**Question 3: Priority (MoSCoW)**
```
Priority level?
- Must — Required for MVP
- Should — Important but not blocking
- Could — Nice to have
```

**Question 4: Module/Labels**
```
Which module? (can select multiple)
- Wallet, Send, Receive, BLIK, Identity
- Contacts, Scheduled, Split
- Mobile, Backend, Blockchain
- Security, Performance, UX
```

### Step 2: Get Title and Description

If title not provided, ask:
```
Brief title for this issue?
```

Then ask:
```
Description (acceptance criteria, technical notes)?
You can use markdown. Type 'done' when finished.
```

### Step 3: Create Issue

```
mcp__linear__create_issue({
  title: "<title>",
  team: "E-y",
  project: "<selected-project>",
  labels: ["<type>", "<priority>", ...modules],
  description: `## Requirement
<user description>

## Acceptance Criteria
- [ ] <criteria from user>

## Priority
<MUST/SHOULD/COULD> have`
})
```

### Step 4: Confirm Creation

Show:
- Issue ID and title
- Link to issue
- Assigned project and labels
- Ask if user wants to start working on it

## Project IDs Reference

| Project | Name |
|---------|------|
| Phase 1 | Phase 1: Core Wallet |
| Phase 2 | Phase 2: BLIK System |
| Phase 3 | Phase 3: Identity & Polish |
| Phase 4 | Phase 4: Feature Overlays |

## Label Reference

**Type:** Feature, Bug, Improvement, Tech Debt
**Priority:** Must, Should, Could
**Module:** Wallet, Send, Receive, BLIK, Identity, Contacts, Scheduled, Split
**Layer:** Mobile, Backend, Blockchain
**Other:** Security, Performance, UX, Onboarding

## Example Flow

```
User: /ey-linear-create Add dark mode support

Claude: Which project is this for?
1. Phase 1: Core Wallet
2. Phase 2: BLIK System
3. Phase 3: Identity & Polish
4. Phase 4: Feature Overlays

User: 3

Claude: What type of issue?
1. Feature
2. Bug
3. Improvement
4. Tech Debt

User: 1

Claude: Priority?
1. Must (MVP required)
2. Should (important)
3. Could (nice to have)

User: 3

Claude: Which modules? (comma-separated numbers)
1. Wallet  2. Send  3. Receive  4. BLIK
5. Identity  6. Mobile  7. Backend  8. UX

User: 6, 8

Claude: Description and acceptance criteria?

User: Add dark mode toggle in settings. Should respect system preference.
- Toggle in settings screen
- Persist preference
- Apply to all screens
done

Claude: Created E-33: Add dark mode support
Project: Phase 3: Identity & Polish
Labels: Feature, Could, Mobile, UX
Link: https://linear.app/e-y/issue/E-33/...

Start working on this issue? (yes/no)
```
