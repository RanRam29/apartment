# 🛡️ אבטחת מידע, אימות והרשאות (Security & Auth)

אבטחת מידע היא קריטית, במיוחד כשמדובר בנכסים, פרטים אישיים ותשלומים.

## 1. זרימת התחברות וניהול תעודות (JWT Flow)
* **יצירת טוקן**: לאחר התחברות מוצלחת, ה-Backend מנפיק JSON Web Token (JWT) קצר-מועד ו-Refresh Token ארוך-מועד.
* **אחסון בטוח בצד לקוח**: הטוקן נשמר ב-Mobile באמצעות `expo-secure-store`, שמצפין את הנתונים ברמת מערכת ההפעלה (Keychain ב-iOS, Keystore ב-Android).
* **אימות בכל בקשה**: כל בקשה ל-API מהאפליקציה עוברת דרך Middleware ב-Node.js שמאמת את החתימה של ה-JWT.

## 2. הפרדת תפקידים (RBAC - Role Based Access Control)
המערכת מפרידה לחלוטין בין הרשאות `TENANT` ל-`LANDLORD`:
* שוכר לא יכול לגשת לראוטים תחת `/api/landlord/dashboard`.
* משכיר לא יכול לבצע פעולת `POST /api/swipe`.
* לוגיקת ההרשאות נאכפת ברמת ה-Router ב-Express.

## 3. הגנה על סודות ותשתיות
* **ללא סודות בקוד (No Hardcoded Secrets)**: כל מחרוזות ההתחברות (Postgres, Mongo, Gemini, Cloudinary) מוגדרות מחוץ לקוד דרך `Kubernetes Secrets`.
* **CORS & Rate Limiting**: הגבלת כמות הבקשות ממשתמש כדי למנוע מתקפות DDoS או Brute Force על ה-Login.
