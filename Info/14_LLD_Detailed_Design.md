# 🛠️ תכן מפורט (LLD - Low-Level Design)

## 🗃️ סכמות נתונים

### PostgreSQL Tables
- **`users`**: `id`, `email`, `password_hash`, `role`, `is_premium`.
- **`apartments`**: `id`, `landlord_id`, `price`, `location_point`, `features (JSONB)`.
- **`swipes`**: `id`, `tenant_id`, `apartment_id`, `direction`, `created_at`.
- **`matches`**: `id`, `tenant_id`, `apartment_id`, `ai_score`.

### MongoDB Collections
- **`messages`**: `match_id`, `sender_id`, `content`, `timestamp`.

## 🔌 API Contracts
- **`POST /api/swipe`**: רישום ב-Postgres + שידור ל-Kafka.
- **`POST /api/recommendations/search`**: פנייה ל-AI Service ➔ החזרת מזהי דירות מ-Postgres.

## 📨 Kafka Topics
- **`apartment.swipe.event`**: עדכון מנוע המלצות (Python).
- **`apartment.match.created`**: טריגר לחישוב `lead_score`.
