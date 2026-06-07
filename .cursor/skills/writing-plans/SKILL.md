---
name: writing-plans
description: Create detailed, task-by-task implementation plans from specs before coding. Use when the user provides requirements for a multi-step feature, refactor, or behavior change and needs a complete executable plan with exact file paths, test-first steps, commands, and commits.
---

# Writing Plans

Announce at start: "I'm using the writing-plans skill to create the implementation plan."

## Required Reference

Before drafting any plan, read `reference.md` in this skill directory and align output quality/structure to that example.
Treat `reference.md` as a formatting and completeness baseline, while still adapting file paths, tests, and code snippets to the actual spec.

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for the codebase.
Document everything they need to know: which files to touch for each task, code, testing, docs to check, and how to test.
Produce a complete plan as bite-sized tasks.

Follow these principles throughout:
- DRY
- YAGNI
- TDD
- Frequent commits

Assume the implementer is a skilled developer with limited knowledge of this toolset and domain.
Assume they may need explicit guidance for good test design.

Context requirement:
- This should be run in a dedicated worktree (created by brainstorming skill).

Default save location:
- `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- If the user gives a different plan location preference, use that instead.

## Scope Check

If the spec covers multiple independent subsystems, suggest splitting into separate plans (one plan per subsystem).
Each plan should independently produce working, testable software.

## File Structure

Before defining tasks, map which files will be created or modified and what each is responsible for.
This is where decomposition decisions are locked in.

Requirements:
- Design units with clear boundaries and interfaces.
- Keep each file to one clear responsibility.
- Prefer smaller focused files over oversized files.
- Keep files that change together close together.
- Split by responsibility, not by technical layer.
- Follow existing codebase patterns.
- Do not unilaterally restructure large existing files unless a focused split is justified by the task.

This structure drives task decomposition.
Each task should be self-contained and sensible on its own.

## Bite-Sized Task Granularity

Each step is one action that should take roughly 2-5 minutes.

Example step granularity:
- "Write the failing test"
- "Run it to make sure it fails"
- "Implement the minimal code to make the test pass"
- "Run the tests and make sure they pass"
- "Commit"

## Plan Document Header

Every plan must start with this header:

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

Use this exact task structure:

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## No Placeholders

Every step must contain the exact content needed to execute it.
These are plan failures and must never appear:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling", "add validation", "handle edge cases"
- "Write tests for the above" without concrete test code
- "Similar to Task N" as a shortcut
- Steps that describe what to do but do not show how
- References to types, functions, or methods not defined in any task

Rules:
- Exact file paths always
- Complete code in every code-changing step
- Exact commands plus expected output
- Apply DRY, YAGNI, TDD, frequent commits

## Self-Review

After writing the complete plan, run this self-check yourself (do not dispatch a subagent for this):

1. Spec coverage:
   - Skim each requirement in the spec.
   - Verify a task implements it.
   - List any gaps.

2. Placeholder scan:
   - Search for red-flag patterns from the "No Placeholders" section.
   - Fix all findings.

3. Type consistency:
   - Ensure types, method signatures, and property names are consistent across tasks.
   - If later tasks use mismatched names, fix them inline.

If a spec requirement has no task, add one.

## Execution Handoff

After saving the plan, offer this exact handoff:

"Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?"

If Subagent-Driven is chosen:
- REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
- Use a fresh subagent per task with two-stage review

If Inline Execution is chosen:
- REQUIRED SUB-SKILL: Use superpowers:executing-plans
- Use batch execution with checkpoints for review
