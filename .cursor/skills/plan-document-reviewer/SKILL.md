---
name: plan-document-reviewer
description: Reviews implementation plan documents for readiness by checking completeness, spec alignment, task decomposition, and buildability. Use when a complete plan is written or when the user asks to validate a plan before implementation.
---

# Plan Document Reviewer

Use this skill when dispatching a subagent to review a plan document for implementation readiness.

## When To Apply

Apply when:
- A complete plan document has been written
- A corresponding spec exists for alignment checks
- The user asks to validate a plan before implementation starts

## Dispatch Timing

Run this reviewer after the full plan is written.

## Subagent Dispatch Template

Use `Task` tool with `subagent_type: "generalPurpose"` and the following payload:

```text
description: "Review plan document"
prompt: |
  You are a plan document reviewer. Verify this plan is complete and ready for implementation.

  **Plan to review:** [PLAN_FILE_PATH]
  **Spec for reference:** [SPEC_FILE_PATH]

  ## What to Check

  | Category | What to Look For |
  |----------|------------------|
  | Completeness | TODOs, placeholders, incomplete tasks, missing steps |
  | Spec Alignment | Plan covers spec requirements, no major scope creep |
  | Task Decomposition | Tasks have clear boundaries, steps are actionable |
  | Buildability | Could an engineer follow this plan without getting stuck? |

  ## Calibration

  **Only flag issues that would cause real problems during implementation.**
  An implementer building the wrong thing or getting stuck is an issue.
  Minor wording, stylistic preferences, and "nice to have" suggestions are not.

  Approve unless there are serious gaps — missing requirements from the spec,
  contradictory steps, placeholder content, or tasks so vague they can't be acted on.

  ## Output Format

  ## Plan Review

  **Status:** Approved | Issues Found

  **Issues (if any):**
  - [Task X, Step Y]: [specific issue] - [why it matters for implementation]

  **Recommendations (advisory, do not block approval):**
  - [suggestions for improvement]
```

## Required Output

The reviewer must return:
- Status
- Issues (if any)
- Recommendations
