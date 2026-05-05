# 🔌 ממשקי תקשורת, APIs ואירועים (Contracts)

ההסכמים (Contracts) בין השירותים השונים שמגדירים את שפת הדיבור של המערכת.

## 1. RESTful API (Node.js)
מוסכמות הכתובות. כל הבקשות חוזרות בפורמט JSON עם מבנה קבוע (`{ success: true, data: {...} }`).
* `POST /api/auth/login` ➔ מקבל אימייל וסיסמה, מחזיר טוקנים.
* `GET /api/apartments/feed` ➔ מביא 20 דירות להחלקה (Paginated).
* `POST /api/recommendations/search` ➔ מקבל טקסט פתוח, שולח בקשה סינכרונית ל-AI Service, מחזיר רשימת מזהי דירות.

## 2. WebSockets (Socket.io)
פרוטוקול התקשורת לשיחות בזמן אמת במסך ה-`ChatScreen`:
* **Events מהלקוח (Emits)**: `join_match` (הרשמה לחדר שיחה ספציפי), `send_message` (משלוח טקסט ל-Match).
* **Events ללקוח (Listeners)**: `receive_message` (הודעה חדשה), `user_typing` (אינדיקציה שהצד השני מקליד).

## 3. Kafka Topics (תקשורת Backend ל-AI)
שירות ה-AI לא צריך להמתין. הוא צורך הודעות ברקע.
* **Topic `apartment.swipe.created`**: מכיל JSON עם `tenant_id`, `apartment_id`, ו-`action`. ה-AI מעדכן את מודל ההעדפות של הלקוח.
* **Topic `apartment.match.created`**: מתריע ל-AI לשלוף נתונים ולשלוח למשכיר את הציון (Score) של הליד שזה עתה נוצר.
