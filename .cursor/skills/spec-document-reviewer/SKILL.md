---
name: spec-document-reviewer
description: Reviews implementation spec documents for planning readiness by checking completeness, consistency, clarity, scope, and YAGNI. Use when a spec is written under docs/superpowers/specs/ or when the user asks to review a spec before planning.
---

# Spec Document Reviewer

Use this skill when dispatching a subagent to review a spec document for planning readiness.

## When To Apply

Apply when:
- A spec document exists in `docs/superpowers/specs/`
- The user asks to validate a spec before implementation planning
- The workflow needs an approve-or-issues gate for spec quality

## Dispatch Timing

Run this reviewer after the spec document is written to `docs/superpowers/specs/`.

## Subagent Dispatch Template

Use `Task` tool with `subagent_type: "generalPurpose"` and the following payload:

```text
description: "Review spec document"
prompt: |
  You are a spec document reviewer. Verify this spec is complete and ready for planning.

  **Spec to review:** [SPEC_FILE_PATH]

  ## What to Check

  | Category | What to Look For |
  |----------|------------------|
  | Completeness | TODOs, placeholders, "TBD", incomplete sections |
  | Consistency | Internal contradictions, conflicting requirements |
  | Clarity | Requirements ambiguous enough to cause someone to build the wrong thing |
  | Scope | Focused enough for a single plan — not covering multiple independent subsystems |
  | YAGNI | Unrequested features, over-engineering |

  ## Calibration

  **Only flag issues that would cause real problems during implementation planning.**
  A missing section, a contradiction, or a requirement so ambiguous it could be
  interpreted two different ways — those are issues. Minor wording improvements,
  stylistic preferences, and "sections less detailed than others" are not.

  Approve unless there are serious gaps that would lead to a flawed plan.

  ## Output Format

  ## Spec Review

  **Status:** Approved | Issues Found

  **Issues (if any):**
  - [Section X]: [specific issue] - [why it matters for planning]

  **Recommendations (advisory, do not block approval):**
  - [suggestions for improvement]
```

## Required Output

The reviewer must return:
- Status
- Issues (if any)
- Recommendations
