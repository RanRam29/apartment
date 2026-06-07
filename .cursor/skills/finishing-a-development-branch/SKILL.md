---
name: finishing-a-development-branch
description: Completes development branch integration by verifying tests, then presenting structured choices for local merge, PR creation, branch preservation, or discard with safety confirmations and cleanup rules.
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling the chosen workflow.

Core principle: verify tests -> present options -> execute choice -> clean up.

Announce at start:
"I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Tests

Before presenting options, verify tests pass:

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

If tests fail:

```text
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Do not proceed to Step 2.

If tests pass, continue to Step 2.

### Step 2: Determine Base Branch

```bash
# Try common base branches
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask:
"This branch split from main - is that correct?"

### Step 3: Present Options

Present exactly these 4 options:

```text
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

Do not add explanation. Keep options concise.

### Step 4: Execute Choice

#### Option 1: Merge Locally

```bash
# Switch to base branch
git checkout <base-branch>

# Pull latest
git pull

# Merge feature branch
git merge <feature-branch>

# Verify tests on merged result
<test command>

# If tests pass
git branch -d <feature-branch>
```

Keep worktree after PR creation so follow-up updates can be pushed if needed.

#### Option 2: Push and Create PR

```bash
# Push branch
git push -u origin <feature-branch>

# Create PR
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

Then cleanup worktree (Step 5).

#### Option 3: Keep As-Is

Report:
"Keeping branch <name>. Worktree preserved at <path>."

Do not cleanup worktree.

#### Option 4: Discard

Confirm first:

```text
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:

```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then cleanup worktree (Step 5).

### Step 5: Cleanup Worktree

For Options 1 and 4:

```bash
git worktree list | grep $(git branch --show-current)
```

If yes:

```bash
git worktree remove <worktree-path>
```

For Options 2 and 3, keep worktree.

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | yes | no | no | yes |
| 2. Create PR | no | yes | yes | no |
| 3. Keep as-is | no | no | yes | no |
| 4. Discard | no | no | no | yes (force) |

## Common Mistakes

Skipping test verification:
- Problem: merge broken code or create failing PR
- Fix: always verify tests before offering options

Open-ended questions:
- Problem: "What should I do next?" is ambiguous
- Fix: present exactly 4 structured options

Automatic worktree cleanup:
- Problem: remove worktree when it may still be needed
- Fix: only cleanup for options 1 and 4

No confirmation for discard:
- Problem: accidental loss of work
- Fix: require typed `discard` confirmation

## Red Flags

Never:
- Proceed with failing tests
- Merge without verifying tests on merged result
- Delete work without confirmation
- Force-push without explicit request

Always:
- Verify tests before offering options
- Present exactly 4 options
- Get typed confirmation for option 4
- Clean up worktree for options 1 and 4 only

## Integration

Called by:
- `subagent-driven-development` (Step 7) after all tasks complete
- `executing-plans` (Step 5) after all batches complete

Pairs with:
- `using-git-worktrees` for worktree lifecycle cleanup
