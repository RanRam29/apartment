# AI Service Local Reliability Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make local AI service verification reproducible and aligned with CI so contributors can reliably run tests and type checks before pushing.

**Architecture:** Introduce a dedicated developer dependency file and a single command entrypoint for local verification, then document an exact bootstrap/verification workflow. Keep runtime behavior unchanged and focus on developer workflow reliability around `pytest`, `pyright`, and environment setup.

**Tech Stack:** Python 3.12, FastAPI, pytest, pyright, pip

---

## File Structure

- `ai-service/requirements-dev.txt` - development-only tools used for local verification (`pytest`, `pytest-cov`, `pyright`)
- `ai-service/Makefile` - one-command developer entrypoints (`setup-dev`, `test`, `typecheck`, `verify`)
- `ai-service/README.md` - local bootstrap and verification instructions with exact commands and expected outputs
- `ai-service/tests/test_smoke_imports.py` - lightweight smoke test that catches missing/invalid local environment setup quickly
- `ai-service/pytest.ini` - maintain consistent test execution settings (existing file, validate stays compatible)
- `.github/workflows/ci.yml` - keep CI check invocation aligned with the new local `verify` workflow

### Task 1: Add explicit dev dependencies for local verification

**Files:**
- Create: `ai-service/requirements-dev.txt`
- Test: `ai-service/tests/test_smoke_imports.py`

- [ ] **Step 1: Write the failing test**

```python
# ai-service/tests/test_smoke_imports.py
def test_pytest_and_runtime_dependencies_import():
    import fastapi  # noqa: F401
    import pydantic  # noqa: F401
    import numpy  # noqa: F401
```

- [ ] **Step 2: Run test to verify it fails in an unprepared environment**

Run: `python -m pytest tests/test_smoke_imports.py -v`
Expected: FAIL with import/module errors when dependencies are not installed in the local environment.

- [ ] **Step 3: Write minimal implementation**

```txt
# ai-service/requirements-dev.txt
-r requirements.txt
pyright==1.1.389
```

- [ ] **Step 4: Install dependencies and re-run the test**

Run: `python -m pip install -r requirements-dev.txt && python -m pytest tests/test_smoke_imports.py -v`
Expected: PASS (`1 passed`) and no import errors.

- [ ] **Step 5: Commit**

```bash
git add ai-service/requirements-dev.txt ai-service/tests/test_smoke_imports.py
git commit -m "chore(ai-service): add explicit dev dependency baseline"
```

### Task 2: Add one-command local verification entrypoints

**Files:**
- Create: `ai-service/Makefile`
- Modify: `ai-service/README.md`
- Test: `ai-service/tests/test_api_endpoints.py`

- [ ] **Step 1: Write the failing test (command contract as docs assertion)**

```md
<!-- ai-service/README.md (expected section) -->
Run full local verification:
make verify
```

- [ ] **Step 2: Run checks to verify they fail before Makefile exists**

Run: `make verify`
Expected: FAIL with `No rule to make target 'verify'` (or equivalent command-not-found on systems without a Makefile).

- [ ] **Step 3: Write minimal implementation**

```makefile
# ai-service/Makefile
.PHONY: setup-dev test typecheck verify

setup-dev:
	python -m pip install -r requirements-dev.txt

test:
	python -m pytest tests/ -v

typecheck:
	python -m pyright src/ --pythonversion 3.12

verify: test typecheck
```

```md
# ai-service/README.md (new content section)
## Local Verification

1. Install dependencies:
   `python -m pip install -r requirements-dev.txt`
2. Run tests:
   `make test`
3. Run type checks:
   `make typecheck`
4. Run full verification:
   `make verify`
```

- [ ] **Step 4: Run verification to confirm behavior**

Run: `python -m pip install -r requirements-dev.txt && make verify`
Expected: PASS with pytest output followed by pyright success (`0 errors`).

- [ ] **Step 5: Commit**

```bash
git add ai-service/Makefile ai-service/README.md
git commit -m "chore(ai-service): add make-based local verification commands"
```

### Task 3: Keep CI invocation aligned with local workflow

**Files:**
- Modify: `.github/workflows/ci.yml`
- Test: `ai-service/Makefile`

- [ ] **Step 1: Write the failing check (workflow command mismatch)**

```yaml
# expected in .github/workflows/ci.yml
- name: Install dependencies
  run: pip install -r requirements-dev.txt

- name: Run tests
  run: make test

- name: Type check (pyright)
  run: make typecheck
```

- [ ] **Step 2: Run a dry validation of the workflow diff**

Run: `git diff -- .github/workflows/ci.yml`
Expected: current workflow still calls direct commands instead of the same local entrypoints.

- [ ] **Step 3: Write minimal implementation**

```yaml
# .github/workflows/ci.yml (ai-service-test job updates)
- name: Install dependencies
  run: pip install -r requirements-dev.txt

- name: Run tests
  run: make test

- name: Type check (pyright)
  run: make typecheck
```

- [ ] **Step 4: Run local command parity check**

Run: `cd ai-service && make test && make typecheck`
Expected: PASS locally using the same commands that CI now uses.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(ai-service): align workflow with local verify commands"
```

### Task 4: Add final developer documentation and regression verification

**Files:**
- Modify: `ai-service/README.md`
- Test: `ai-service/tests/test_smoke_imports.py`
- Test: `ai-service/tests/test_api_endpoints.py`

- [ ] **Step 1: Write the failing docs check**

```md
<!-- required section in ai-service/README.md -->
## Troubleshooting

- `No module named pytest` -> run `python -m pip install -r requirements-dev.txt`
- `pyright: command not found` -> run `python -m pyright src/ --pythonversion 3.12`
```

- [ ] **Step 2: Run verification before docs update**

Run: `make verify`
Expected: PASS for code checks; troubleshooting guidance is still missing from docs.

- [ ] **Step 3: Write minimal implementation**

```md
## Troubleshooting

- `No module named pytest`: ensure your venv is active, then run:
  `python -m pip install -r requirements-dev.txt`
- `No module named src` during tests: run commands from `ai-service/` directory.
- `pyright` import issues: rerun
  `python -m pyright src/ --pythonversion 3.12`
```

- [ ] **Step 4: Run final focused regression checks**

Run: `python -m pytest tests/test_smoke_imports.py tests/test_api_endpoints.py -v && make typecheck`
Expected: PASS for tests and pyright with no new errors.

- [ ] **Step 5: Commit**

```bash
git add ai-service/README.md
git commit -m "docs(ai-service): add local verification troubleshooting guide"
```

## Self-Review

1. **Spec coverage check**
- Requirement: local verification must be reproducible -> Covered by Task 1 and Task 2.
- Requirement: local and CI commands should match -> Covered by Task 3.
- Requirement: contributors need clear bootstrap guidance -> Covered by Task 2 and Task 4.
- Gaps found: none.

2. **Placeholder scan**
- Searched for: `TBD`, `TODO`, `implement later`, `fill in details`, `add validation`, `handle edge cases`.
- Result: none found.

3. **Type consistency**
- Python commands consistently use `python -m ...`.
- Verification flow consistently uses `requirements-dev.txt`, `make test`, and `make typecheck`.
- Paths and command names are consistent across tasks.

Plan complete and saved to `docs/superpowers/plans/2026-05-05-ai-service-local-reliability-baseline.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
