# 🚀 תהליכי פריסה ו-CI/CD (Deployment Pipeline)

כמערכת Enterprise, תהליך הפריסה חייב להיות אוטומטי, יציב, ובעל אפס זמן השבתה (Zero Downtime).

## 1. צד לקוח (Mobile) - תהליך שחרור באמצעות Expo EAS
האפליקציה משתמשת בתשתיות הענן של **Expo Application Services (EAS)**:
* **EAS Build**: בניית קובצי ההתקנה (`.apk` לאנדרואיד ו-`.ipa` ל-iOS) מתבצעת בענן, ללא צורך במחשב Mac מקומי. הקונפיגורציה נמצאת ב-`eas.json`.
* **EAS Submit**: העלאה אוטומטית לחנויות Google Play ו-App Store (TestFlight).
* **EAS Update (Over The Air)**: לעדכוני קוד קטנים (JS/TS בלבד, ללא שינוי נייטיב), המערכת דוחפת עדכון ישירות למכשירי המשתמשים ללא צורך באישור מחדש מהחנויות.

## 2. שירותי צד שרת (Backend & AI Service)
התהליך מנוהל דרך מערכת CI/CD (לדוגמה GitHub Actions):
1. **Push / Merge to `main`**: מפעיל את ה-Pipeline.
2. **Linting & Testing**: הרצת בדיקות אוטומטיות ל-Node.js ו-Python.
3. **Docker Build & Push**: בניית קונטיינרים מעודכנים ודחיפתם ל-Container Registry (למשל Docker Hub או AWS ECR).
4. **Deploy to Kubernetes**: 
   - ה-CI מעדכן את קובצי ה-`deployment.yaml` עם ה-Tag החדש של הקונטיינר.
   - מתבצע **Rolling Update**: פודים (Pods) חדשים עולים ורק כשהם מסומנים כ-`Ready` (עוברים Health Check), הפודים הישנים נמחקים. זה מבטיח שהמשתמשים לא יחוו ניתוקים.
