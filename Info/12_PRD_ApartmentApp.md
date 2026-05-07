# 📄 מסמך דרישות מוצר (PRD - Product Requirements Document)

**שם המוצר:** ApartmentApp
**חזון:** פלטפורמת השכרת דירות במודל "Swipe to Match".

## ✨ תכונות ליבה והקשרן הארכיטקטוני

### 1. מנגנון Swipe (החלקה והתאמה)
* **תיאור:** ממשק כרטיסיות דינמי. החלקה ימינה (לייק), שמאלה (דילוג).
* **מבנה ארכיטקטוני:** - **Frontend:** React Native (`useSwipeStore`).
    - **Backend:** Node.js Express API.
    - **DB:** עדכון טבלת `Swipes` ב-PostgreSQL.
    - **Microservices:** שידור אירוע ל-Kafka לעדכון מנוע ההמלצות ב-AI Service.

### 2. חיפוש בשפה טבעית (NLP Search)
* **תיאור:** שורת חיפוש חופשית מבוססת Gemini.
* **מבנה ארכיטקטוני:** - **AI Service:** קבלת מחרוזת ותרגומה ל-JSON בעזרת Gemini.
    - **DB:** שאילתה על `Apartments` ב-Postgres ושמירת העדפות ב-MongoDB.

### 3. דאשבורד משכירים ודירוג לידים (Lead Scoring)
* **תיאור:** ממשק "Enterprise SaaS" המציג לידים מדורגים.
* **מבנה ארכיטקטוני:** - **AI Service:** הרצת `lead_scoring.py` בעקבות אירוע Kafka.
    - **DB:** כתיבת הציון ל-Redis (לשליפה מהירה) ול-Postgres.

### 4. צ'אט בזמן אמת (Real-Time Messaging)
* **תיאור:** שיחות לאחר Match.
* **מבנה ארכיטקטוני:** - **Transport:** WebSockets (Socket.io).
    - **DB:** שמירת היסטוריה ב-MongoDB (`Messages`).

### 5. מונטיזציה (Billing)
* **תיאור:** תשלום עבור Boost וחיפושי פרימיום.
* **מבנה ארכיטקטוני:** - **Gateway:** Meshulam API.
    - **Flow:** Webhook מהספק ל-Backend המעדכן `is_premium` ב-Postgres.
