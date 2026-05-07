# 🏗️ ארכיטקטורת-על (HLD / CDR - High-Level Design)

## 🌐 טופולוגיית המערכת
המערכת מבוססת על הפרדת דאגות מוחלטת בין הממשק, הלוגיקה והבינה המלאכותית.

1. **Client (Mobile):** React Native Expo.
2. **Backend:** Node.js Express (ה-"Orchestrator").
3. **AI Service:** Python FastAPI (ה-"Brain").
4. **Communication:**
    - **Synchronous:** REST API / WebSockets.
    - **Asynchronous:** Apache Kafka.

## 🗄️ אסטרטגיית אחסון (Polyglot Persistence)
* **PostgreSQL:** נתונים רלציוניים (Users, Apartments, Swipes, Matches).
* **MongoDB:** נתונים גמישים (Chat Messages, User Preferences).
* **Redis:** Caching (Feed, AI Scores, Sessions).

## ☁️ תשתיות
* **Docker & Kubernetes:** ניהול קונטיינרים.
* **Ingress:** ניתוב תעבורה לפי Path (`/api`, `/chat`).
