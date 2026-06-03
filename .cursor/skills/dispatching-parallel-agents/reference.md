# Dispatching Parallel Agents Reference

## Quick Independence Test

Use this before dispatching:

1. **Scope overlap check**
   - Are failures in different files or subsystems?
   - Would fixes likely touch different implementation areas?
2. **Root-cause coupling check**
   - Could one shared bug explain all failures?
   - Is there a recent change that broadly affects all domains?
3. **State dependency check**
   - Does one domain need output from another domain first?
   - Do tasks mutate shared resources in a way that introduces ordering?
4. **Edit collision risk**
   - Are agents likely to edit the same files?
   - If yes, split by function-level ownership or run sequentially.

Dispatch in parallel only if all checks are safe.

## Prompt Variants

Use one of these templates depending on task type.

### 1) Test-Failure Investigation (default)

```markdown
Fix failures in `<test-file>` only.

Failing tests:
1. "<name>" - <mismatch>
2. "<name>" - <mismatch>

Evidence:
- <error output>
- <repro command and result>

Goal:
- Make these tests pass with minimal, domain-scoped changes.

Constraints:
- Do not refactor unrelated modules.
- Do not modify other test files unless strictly necessary.
- Do not mask failures by increasing timeouts without evidence.

Return:
- Root cause
- Files changed
- Why fix is correct
- Follow-up checks
```

### 2) Production Bug in One Subsystem

```markdown
Investigate and fix bug in `<subsystem>` related to `<symptom>`.

Scope:
- Allowed: files under `<path-prefix>`
- Not allowed: broad architecture changes

Goal:
- Restore expected behavior and keep change minimal.

Validation:
- Run `<targeted-command>`
- Show before/after behavior

Return:
- Root cause
- Exact changes
- Validation evidence
- Remaining risks
```

### 3) Refactor-Safe Fix (high guardrails)

```markdown
Fix only what is needed for `<failing-domain>`.

Hard constraints:
- No API shape changes.
- No renaming public symbols.
- No cross-domain refactors.
- Keep diff small and localized.

If fix requires breaking a constraint:
- Stop and report blocker with options.

Return:
- Minimal patch summary
- Constraint compliance check
- Test results
```

## Dispatch Checklist

Before launching agents:
- [ ] Domains are independent by scope and root cause
- [ ] One clear owner domain per agent
- [ ] Prompts include failing names and evidence
- [ ] Constraints prevent broad edits
- [ ] Return format is explicit

After agents return:
- [ ] Compare changed file lists
- [ ] Resolve overlaps before merge
- [ ] Run targeted tests per domain
- [ ] Run full relevant suite

## Conflict-Resolution Playbook

When two agents touch the same file:

1. **Classify conflict type**
   - **Textual only**: same file, different regions
   - **Semantic overlap**: same logic block changed differently
2. **Pick canonical intent**
   - Choose the change that best matches failing test intent and constraints
3. **Reconcile minimally**
   - Keep one behavior model; avoid combining incompatible fixes
4. **Re-verify both domains**
   - Re-run both targeted test sets, then wider suite
5. **Document decision**
   - Record why one approach was kept and what was discarded

## Red Flags (Switch to Sequential)

Stop parallelization and switch to coordinated or sequential debugging if:
- A single root cause starts explaining multiple domains
- Agents repeatedly edit the same symbols or files
- Test failures shift between domains after each fix
- Shared state or ordering becomes necessary for correctness

## Suggested Return Schema for Agents

Ask agents to return in this structure for fast integration:

```markdown
## Root cause
<1-3 bullets>

## Changes made
- `path/to/file`: <what changed and why>

## Validation
- Command: `<command>`
- Result: `<pass/fail and key output>`

## Risks / follow-ups
- <if any>
```
