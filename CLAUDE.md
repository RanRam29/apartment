# DirApp — Claude Code Instructions

## Current Role: Agent CLAUDE_CODE — Orchestrator

> **⚠️ סטטוס MVP v3.0: כל 17 משימות MERGED. כעת בשלב אימות ייצור + Next Features.**
>
> **📋 מקור מידע יחיד: `MASTER.md`** — קרא לפני כל עבודה. עדכן אחרי כל שינוי.

---

## צוות עובדים

| עובד | תחום | Worktree |
|------|------|---------|
| **Claude Code (Orchestrator)** | ניהול, merge, bugs קריטיים | `C:\apartmentapp` (main) |
| **Cursor** | Financial, Admin, Cron | `C:\apartmentapp-cursor` |
| **Antigravity (Windsurf)** | Identity, Mobile, KYC | `C:\apartmentapp-windsurf` |

---

## כללי עבודה

1. **לפני כל עבודה** — קרא `MASTER.md`, בדוק סטטוס הפיצ'ר
2. **אחרי כל שינוי** — עדכן את הטבלה ב-`MASTER.md` (סטטוס + תאריך + הערה)
3. **Merge לmain** — רק הOrchestrator (Claude Code)
4. **Bugs חדשים** — הוסף ל-`MASTER.md` טבלת Bugs עם עדיפות

---

## Code Conventions

- All new endpoints: `/api/v3/` prefix
- Models: UUID primary keys, Sequelize, `backend/src/models/pg/`
- Auth: `const { authenticate, requireRole } = require('../middleware/auth')`
- Tests: Jest, `backend/tests/`
- Branch naming: `fix/<description>`, `feat/<description>`

---

## Production

- Backend: `https://apartment-backend-v24y.onrender.com`
- Frontend: `https://apartment-olive.vercel.app`
- Deploy: push to `main` → Render auto-deploy (~3 min)
- Health check: `GET /health`
