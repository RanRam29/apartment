# 🏗️ סקירת ארכיטקטורה כללית ומפת קשרים - ApartmentApp

המערכת פועלת כפלטפורמת **Enterprise SaaS** עם מיקרו־שירותים אופציונליים (Python AI), תוך שימוש ב־**Backend מרכזי ב־Node.js** כנקודת הכניסס העיקרית לאפליקציה.

לפרטי AI וזרימות נוכחיות ראה גם [`AI_Capabilities_Current_State.md`](AI_Capabilities_Current_State.md).

## 🌐 מפת הקשרים בין השירותים (Service Topology)

1. **Client (Mobile App)** ➔ **Backend (Node.js)**:
   - REST API (`https://<backend-host>/api/...`) — אימות, דירות, swipe, תשלומים וכו'.
   - WebSockets — צ'אט בזמן אמת (כאשר מוגדר).

2. **Backend (Node.js)** ➔ **מסדי נתונים ומטמון**:
   - **PostgreSQL** — משתמשים, דירות, התאמות, swipe.
   - **MongoDB** — העדפות חיפוש (`UserPreferences`), הודעות צ'אט וכו'.
   - **Redis** — מטמון (כולל תוצאות NLP לפי שאילתה), סשנים לפי פריסה.

3. **Backend (Node.js)** ➔ **Google Gemini API** (נתיב ייצור ראשי למובייל):
   - קריאות ישירות מ־[`backend/src/services/geminiService.js`](../backend/src/services/geminiService.js): פריסת חיפוש בשפה טבעית (NLP) ויצירת טקסט שיווקי למודעות.
   - מפתח: משתנה סביבה **`GEMINI_API_KEY`** בשרת ה־Backend בלבד.
   - **לא נדרש** מיקרו־שירות Python כדי שהמובייל ישתמש בתכונות AI אלו.

4. **AI Service (Python, FastAPI)** — [`ai-service/`](../ai-service/) — **אופציונלי**:
   - מציע נקודות קצה מקבילות (NLP, סיכום דירה, דירוג דירות, ציון לידים).
   - ה-Backend **מנסה proxy** לדירוג נומרי כש־`AI_SERVICE_URL` מוגדר, עם **fallback Node** ([`aiServiceClient.js`](../backend/src/services/aiServiceClient.js)). NLP ו-marketing copy נשארים ב-Node + Gemini (ראה [`ADR_AI_Service_Strategy.md`](ADR_AI_Service_Strategy.md)).
   - יכול לרוץ כשירות נפרד בפריסת Docker/Kubernetes כשמחברים אותו במפורש.

5. **Kafka** — **אופציונלי**:
   - ב־[`backend/src/server.js`](../backend/src/server.js) אתחול Kafka נכשל בשקט אם אין broker (למשל Render חינמי). לא חובה לנתיב AI דרך Node.

## 🔐 ריכוז שירותים חיצוניים (External Providers)

ערכים רגישים מוגדרים רק ב־**משתני סביבה / סודות** בפריסה — לא במסמכי Info ב-repo.

- **PostgreSQL** (למשל Neon).
- **MongoDB Atlas** או מופע Mongo אחר.
- **Redis** — לפי `REDIS_URL` או פריסה מקומית.
- **Cloudinary** — העלאת תמונות.
- **Google Gemini** — חיפוש NLP ויצירת טקסט שיווקי דרך ה־Backend.
