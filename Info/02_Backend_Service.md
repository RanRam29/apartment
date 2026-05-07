# ⚙️ שירות ליבה - Backend (Node.js & Express)

ה-Backend הוא הנתב הראשי של המערכת ומחזיק ברוב ההרשאות למסדי הנתונים והשירותים החיצוניים.

## 🔗 חיבורים ומפתחות גישה (Credentials & Connections)

### 1. PostgreSQL (via Neon.tech)
מסד נתונים זה שומר את האובייקטים הקשיחים: `User`, `Apartment`, `Match`, `Swipe`.
- **סוג חיבור**: Connection Pooling פעיל.
- **מחרוזת התחברות (Connection String)**: נשמרת במשתנה הסביבה `DATABASE_URL`.
- **פרטים**:
  - **משתמש / סיסמה / DB Name**: מנוהלים דרך ספק מסד הנתונים ואינם נשמרים בקוד.

### 2. MongoDB (via MongoDB Atlas)
משמש לשמירת הודעות הצ'אט (`Message`) והעדפות חיפוש (`UserPreferences`).
- **סוג חיבור**: Node.js Driver v6.7+.
- **מחרוזת התחברות (Connection String)**:
  נשמרת במשתנה הסביבה `MONGO_URI`.
- **פרטים**:
  - **משתמש / סיסמה / Cluster**: מנוהלים דרך MongoDB Atlas ואינם נשמרים בקוד.

### 3. Cloudinary (ניהול ואחסון תמונות)
משמש לשמירת תמונות הנכסים והפרופילים.
- **מחרוזת התחברות כוללת (CLOUDINARY_URL)**:
  נשמרת במשתנה הסביבה `CLOUDINARY_URL`.
- **פרטים**:
  - **API Key / API Secret / Cloud Name**: מנוהלים דרך Cloudinary ואינם נשמרים בקוד.

### 4. תקשורת פנימית
- **Kafka (`apartment_kafka:29092`)**: ה-Backend פועל כ-Producer כדי לפרסם אירועים כמו לחיצות, יצירת יוזר חדש ו-Match חדש ל-Topic ייעודי שמנוהל על ידי שירות ה-AI.
- **Redis (`apartment_redis:6379`)**: מתחבר לרדיס המקומי לניהול מטמון (Caching). סיסמה נמשכת ממשתנה הסביבה `${REDIS_PASSWORD}`.
