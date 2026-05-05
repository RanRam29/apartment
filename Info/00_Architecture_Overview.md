# 🏗️ סקירת ארכיטקטורה כללית ומפת קשרים - ApartmentApp

המערכת בנויה כפלטפורמת **Enterprise SaaS** מודרנית בארכיטקטורת Microservices. 

## 🌐 מפת הקשרים בין השירותים (Service Topology)
המערכת פועלת כרשת של שירותים המתקשרים ביניהם באופן סינכרוני (HTTP/REST ו-WebSockets) ואסינכרוני (Kafka):

1. **Client (Mobile App)** ➔ **Backend (Node.js)**:
   - תקשורת דרך REST API (`http://<backend-url>:3000/api/...`) לביצוע פעולות ליבה (Login, Swipe, Upload).
   - תקשורת בזמן אמת דרך WebSockets לניהול הצ'אט.
2. **Backend (Node.js)** ➔ **Databases**:
   - מחובר ל-**PostgreSQL (Neon)** לניהול יוזרים, דירות ומאצ'ים.
   - מחובר ל-**MongoDB (Atlas)** לשמירת היסטוריית צ'אט והעדפות חיפוש.
   - מחובר ל-**Redis** לשמירת סשנים, קאשינג מהיר של רשימת הדירות ו-NLP queries.
3. **Backend (Node.js)** ➔ **AI Service (Python)**:
   - **אסינכרוני (Kafka)**: ה-Backend מפרסם אירועים (למשל `SWIPE_EVENT`) ל-Kafka בפורט `29092`. ה-AI Service מאזין ושואב נתונים לחישוב דירוגים.
   - **סינכרוני (HTTP)**: ה-Backend שולח בקשות ל-API של ה-AI (`http://ai-service:8000/api/...`) עבור חיפוש שפה טבעית (NLP).
4. **AI Service (Python)** ➔ **External APIs**:
   - מתקשר עם ה-API של **Google Gemini** כדי להבין חיפושים בשפה חופשית ולסכם תיאורי דירות.

## 🔐 ריכוז שירותים חיצוניים (External Providers)
- **מסד נתונים רלציוני**: Neon Serverless Postgres.
- **מסד נתונים מסמכי (NoSQL)**: MongoDB Atlas.
- **אחסון תמונות**: Cloudinary.
- **בינה מלאכותית**: Google Gemini API.
