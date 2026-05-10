# ⚙️ שירות ליבה - Backend (Node.js & Express)

ה-Backend הוא הנתב הראשי של המערכת ומחזיק ברוב ההרשאות למסדי הנתונים והשירותים החיצוניים.

## 🔗 חיבורים ומשתני סביבה

**אין לאחסן סיסמאות, מפתחות API או connection strings מלאים במסמכי Info או ב-git.**  
הערכים הבאים מוגדרים רק בפריסה (Render, Docker secrets, `.env` מקומי שלא ב-repo):

### 1. PostgreSQL (למשל Neon)

- **שימוש**: `User`, `Apartment`, `Match`, `Swipe`.
- **משתנה**: `DATABASE_URL` או פרמטרים כמו `POSTGRES_*` לפי [`backend/.env.example`](../backend/.env.example).
- **דוגמה פורמט (לא ערך אמיתי)**:  
  `postgresql://USER:PASSWORD@HOST/neondb?sslmode=require`

### 2. MongoDB (Atlas או מופע אחר)

- **שימוש**: הודעות צ'אט (`Message`), העדפות (`UserPreferences`).
- **משתנה**: `MONGO_URI`.

### 3. Cloudinary

- **שימוש**: תמונות נכסים ופרופילים.
- **משתנים**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET` (ולפי מימוש גם URL מלא אם נדרש).

### 4. Redis

- **שימוש**: מטמון, סשנים לפי פריסה.
- **משתנה**: `REDIS_URL` (או פריסה ללא Redis עם fallback ב-memory בפיתוח).

### 5. תקשורת פנימית אופציונלית

- **Kafka**: אופציונלי — אם אין broker, השרת ממשיך בלי streaming ([`backend/src/server.js`](../backend/src/server.js)).
- **מיקרו־שירות AI (Python)**: לא חובה לנתיב Gemini ב-Node; ראה [`ADR_AI_Service_Strategy.md`](ADR_AI_Service_Strategy.md).
