# 🧪 אסטרטגיית בדיקות (Testing Strategy)

כדי לאפשר שחרור גרסאות מהיר (CI/CD), המערכת נשענת על פירמידת בדיקות אוטומטית.

## 1. בדיקות יחידה (Unit Tests)
* **ב-Backend (Jest)**: בדיקת פונקציות ליבה מבודדות - למשל, האלגוריתם שמוודא התאמה (`matchingService`) מבלי להתחבר ל-DB אמיתי אלא למסד נתונים מדומה (Mock).
* **ב-AI Service (PyTest)**: וידוא שמנוע דירוג הלידים (`lead_scoring.py`) מתייחס נכון למשקלים (למשל, שציון פיננסי מקבל משקל גבוה יותר מחיות מחמד לפי הגדרות מסוימות).

## 2. בדיקות אינטגרציה (Integration Tests)
* בדיקות שנועדו לבדוק תקשורת בין סרוויסים. 
* שימוש ב-`Supertest` ב-Node.js כדי לשלוח בקשות `POST /api/swipe` ולבדוק שהפנייה אכן יורדת ונרשמת ב-PostgreSQL המקומי שבסביבת הבדיקות.

## 4. Smoke לזרימות AI (QA-050)

* סקריפט: [`backend/scripts/ai-smoke.js`](../backend/scripts/ai-smoke.js)
* הרצה: `cd backend && npm run smoke:ai`
* משתני סביבה (staging): `API_BASE_URL`, `TENANT_EMAIL`, `TENANT_PASSWORD`, `LANDLORD_EMAIL`, `LANDLORD_PASSWORD`, וב-backend `GEMINI_API_KEY`.
* בדיקות: health, NLP search (tenant), dashboard/leads/marketing copy (landlord). ללא credentials — health בלבד.

## 5. בדיקות קצה-לקצה (E2E - End to End)
* כלי כמו **Detox** או **Maestro** ל-React Native.
* הכלים מריצים סימולטור אמיתי (אייפון/אנדרואיד), לוחצים על כפתורים, עושים מחוות Swipe על המסך, ובודקים שהמסך הבא נטען (למשל מסך ה-Match שקופץ).
