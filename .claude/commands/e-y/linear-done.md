---
name: ey-linear-done
description: Mark Linear issue as Done and update status
---

# E-Y Linear Done Command

Mark a Linear issue as completed (Done status).

## Usage

```
/ey-linear-done [issue-id]
```

If no issue ID provided, will show recent In Progress issues to select from.

## Execution Steps

1. **If no issue ID provided, list In Progress issues:**
   - Use `mcp__linear__list_issues` with `state: "In Progress"` and `team: "E-y"`
   - Show list to user and ask which to mark as done

2. **Get issue details:**
   - Use `mcp__linear__get_issue` to fetch current issue info
   - Display: title, description, current status, labels

3. **Confirm completion with user:**
   - Ask: "Mark [E-XX: Title] as Done?"
   - Show acceptance criteria if present in description

4. **Update issue status:**
   ```
   mcp__linear__update_issue({
     id: "<issue-id>",
     state: "Done"
   })
   ```

5. **Show confirmation:**
   - Issue ID and title
   - Link to issue
   - Suggest next issue from same project

## Optional: Add completion comment

If user wants to add a note:
```
mcp__linear__create_comment({
  issueId: "<issue-id>",
  body: "Completed: <summary of what was done>"
})
```

## Example Flow

```
User: /ey-linear-done

Claude: Here are your In Progress issues:
1. E-6: FR-1.1: Create new wallet with BIP-39 seed phrase
2. E-11: FR-2.1: Send ETH/tokens to EVM address

Which one to mark as Done? (enter number or issue ID)

User: 1

Claude: Marking E-6 as Done...
Done! E-6 is now complete.

Next issue in Phase 1: Core Wallet:
- E-7: FR-1.2: Import wallet from seed phrase

Start working on E-7? (yes/no)
```
