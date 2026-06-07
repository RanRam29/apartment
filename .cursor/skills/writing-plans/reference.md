# Writing Plans Reference Example

Use this as a quality bar for what "complete" looks like. This is an illustrative sample plan for a small feature.

---

# Add User Profile Display Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to set and view a profile display name that is validated and persisted.

**Architecture:** Add a nullable `display_name` field to the user model, expose it through API read/write paths, and render it in the profile UI. Follow strict TDD: write failing tests first for validation, persistence, and rendering, then implement the minimum code to pass. Keep changes focused by touching model, API handler, and profile UI files only.

**Tech Stack:** TypeScript, Node.js, Express, PostgreSQL, React, Jest, Supertest

---

## File Structure

- `backend/db/migrations/2026_05_05_add_display_name_to_users.sql` - adds `display_name` column and rollback
- `backend/src/models/user.ts` - extends user type and persistence mapping
- `backend/src/routes/profile.ts` - accepts and validates `displayName` update payload
- `backend/tests/profile.update.test.ts` - API behavior tests (validation + persistence)
- `web/src/pages/profile/ProfilePage.tsx` - renders and edits display name
- `web/src/pages/profile/ProfilePage.test.tsx` - UI tests for rendering and save flow
- `docs/api/profile.md` - documents request/response contract changes

### Task 1: Add database support for display name

**Files:**
- Create: `backend/db/migrations/2026_05_05_add_display_name_to_users.sql`
- Test: `backend/tests/profile.update.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("persists displayName on profile update", async () => {
  const res = await request(app)
    .patch("/api/profile")
    .send({ displayName: "Alex Rivera" })
    .expect(200);

  expect(res.body.user.displayName).toBe("Alex Rivera");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- backend/tests/profile.update.test.ts -t "persists displayName on profile update"`
Expected: FAIL with database error like `column "display_name" does not exist`

- [ ] **Step 3: Write minimal implementation**

```sql
-- up
ALTER TABLE users ADD COLUMN display_name VARCHAR(80);

-- down
ALTER TABLE users DROP COLUMN display_name;
```

- [ ] **Step 4: Run test to verify it still fails for next missing layer**

Run: `npm run test -- backend/tests/profile.update.test.ts -t "persists displayName on profile update"`
Expected: FAIL with assertion mismatch (value not returned yet)

- [ ] **Step 5: Commit**

```bash
git add backend/db/migrations/2026_05_05_add_display_name_to_users.sql
git commit -m "feat(db): add users.display_name column"
```

### Task 2: Wire display name through backend model and route

**Files:**
- Modify: `backend/src/models/user.ts`
- Modify: `backend/src/routes/profile.ts`
- Test: `backend/tests/profile.update.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("rejects displayName longer than 80 chars", async () => {
  const longName = "x".repeat(81);
  const res = await request(app)
    .patch("/api/profile")
    .send({ displayName: longName })
    .expect(400);

  expect(res.body.error).toBe("displayName must be 1-80 characters");
});

it("returns trimmed displayName in profile response", async () => {
  const res = await request(app)
    .patch("/api/profile")
    .send({ displayName: "  Alex Rivera  " })
    .expect(200);

  expect(res.body.user.displayName).toBe("Alex Rivera");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- backend/tests/profile.update.test.ts -t "displayName"`
Expected: FAIL with status code mismatch and/or missing `displayName` in response

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/src/models/user.ts
export type User = {
  id: string;
  email: string;
  displayName: string | null;
};

export function mapUserRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
  };
}
```

```ts
// backend/src/routes/profile.ts
router.patch("/api/profile", async (req, res) => {
  const raw = req.body.displayName;
  const displayName = typeof raw === "string" ? raw.trim() : null;

  if (displayName !== null && (displayName.length < 1 || displayName.length > 80)) {
    return res.status(400).json({ error: "displayName must be 1-80 characters" });
  }

  const updated = await profileService.updateProfile(req.user.id, { displayName });
  return res.status(200).json({ user: updated });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- backend/tests/profile.update.test.ts -t "displayName"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/user.ts backend/src/routes/profile.ts backend/tests/profile.update.test.ts
git commit -m "feat(profile): validate and persist displayName"
```

### Task 3: Render and edit display name in profile UI

**Files:**
- Modify: `web/src/pages/profile/ProfilePage.tsx`
- Test: `web/src/pages/profile/ProfilePage.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders current display name", async () => {
  render(<ProfilePage />);
  expect(await screen.findByDisplayValue("Alex Rivera")).toBeInTheDocument();
});

it("submits updated display name", async () => {
  render(<ProfilePage />);
  const input = await screen.findByLabelText("Display name");
  await userEvent.clear(input);
  await userEvent.type(input, "Alex R.");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Profile updated")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- web/src/pages/profile/ProfilePage.test.tsx -t "display name"`
Expected: FAIL with missing input label or missing success state

- [ ] **Step 3: Write minimal implementation**

```tsx
const [displayName, setDisplayName] = useState(profile.displayName ?? "");

return (
  <form onSubmit={onSubmit}>
    <label htmlFor="display-name">Display name</label>
    <input
      id="display-name"
      value={displayName}
      onChange={(e) => setDisplayName(e.target.value)}
      maxLength={80}
    />
    <button type="submit">Save</button>
  </form>
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- web/src/pages/profile/ProfilePage.test.tsx -t "display name"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/profile/ProfilePage.tsx web/src/pages/profile/ProfilePage.test.tsx
git commit -m "feat(profile-ui): add editable display name field"
```

### Task 4: Update docs and run focused regression checks

**Files:**
- Modify: `docs/api/profile.md`
- Test: `backend/tests/profile.update.test.ts`
- Test: `web/src/pages/profile/ProfilePage.test.tsx`

- [ ] **Step 1: Write the failing docs test/check**

```md
PATCH /api/profile
Request body:
{
  "displayName": "Alex Rivera"
}
```

Validation rules:
- 1-80 chars after trimming
- nullable by sending `null`

- [ ] **Step 2: Run checks to verify current state before docs update**

Run: `npm run test -- backend/tests/profile.update.test.ts web/src/pages/profile/ProfilePage.test.tsx`
Expected: PASS (code complete), docs still missing new field details

- [ ] **Step 3: Write minimal implementation**

```md
Response:
{
  "user": {
    "id": "usr_123",
    "email": "alex@example.com",
    "displayName": "Alex Rivera"
  }
}
```

- [ ] **Step 4: Run final verification**

Run: `npm run test -- backend/tests/profile.update.test.ts web/src/pages/profile/ProfilePage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/api/profile.md
git commit -m "docs(api): document profile displayName contract"
```

## Self-Review

1. **Spec coverage check**
- Requirement: persist display name -> Covered by Task 1 and Task 2.
- Requirement: validate input -> Covered by Task 2.
- Requirement: show/edit in UI -> Covered by Task 3.
- Requirement: docs updated -> Covered by Task 4.
- Gaps found: none.

2. **Placeholder scan**
- Searched for: `TBD`, `TODO`, `implement later`, `fill in details`, `add validation`, `handle edge cases`.
- Result: none found.

3. **Type consistency**
- `displayName` is used consistently across backend route, model mapping, API response, and UI tests.
- Length rule is consistently `1-80` characters.

Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
