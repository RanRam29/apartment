# ⚙️ שירות ליבה - Backend (Node.js & Express)

ה-Backend הוא הנתב הראשי של המערכת ומחזיק ברוב ההרשאות למסדי הנתונים והשירותים החיצוניים.

## 🔗 חיבורים ומפתחות גישה (Credentials & Connections)

### 1. PostgreSQL (via Neon.tech)
מסד נתונים זה שומר את האובייקטים הקשיחים: `User`, `Apartment`, `Match`, `Swipe`.
- **סוג חיבור**: Connection Pooling פעיל.
- **מחרוזת התחברות (Connection String)**:
  `postgresql://neondb_owner:npg_9QLFKCkbi7BH@ep-curly-wave-aljnjjlz-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- **פרטים**: 
  - **משתמש**: `neondb_owner`
  - **סיסמה**: `npg_9QLFKCkbi7BH`
  - **DB Name**: `neondb`

### 2. MongoDB (via MongoDB Atlas)
משמש לשמירת הודעות הצ'אט (`Message`) והעדפות חיפוש (`UserPreferences`).
- **סוג חיבור**: Node.js Driver v6.7+.
- **מחרוזת התחברות (Connection String)**:
  `mongodb+srv://randram_db_user:KVy0CNVQnOjIerHL@apartmentdb.uze91ml.mongodb.net/?appName=ApartmentDB`
- **פרטים**:
  - **משתמש**: `randram_db_user`
  - **סיסמה**: `KVy0CNVQnOjIerHL`
  - **Cluster**: `apartmentdb.uze91ml.mongodb.net`

### 3. Cloudinary (ניהול ואחסון תמונות)
משמש לשמירת תמונות הנכסים והפרופילים.
- **מחרוזת התחברות כוללת (CLOUDINARY_URL)**:
  `cloudinary://568828816476755:6y6nLKKyAeFMAT57mGqVJanItVg@dp0o5l9qr`
- **פרטים**:
  - **API Key**: `568828816476755`
  - **API Secret**: `6y6nLKKyAeFMAT57mGqVJanItVg`
  - **Cloud Name**: `dp0o5l9qr`

### 4. תקשורת פנימית
- **Kafka (`apartment_kafka:29092`)**: ה-Backend פועל כ-Producer כדי לפרסם אירועים כמו לחיצות, יצירת יוזר חדש ו-Match חדש ל-Topic ייעודי שמנוהל על ידי שירות ה-AI.
- **Redis (`apartment_redis:6379`)**: מתחבר לרדיס המקומי לניהול מטמון (Caching). סיסמה נמשכת ממשתנה הסביבה `${REDIS_PASSWORD}`.
