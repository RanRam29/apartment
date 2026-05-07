# 📱 צד לקוח - Mobile App (React Native/Expo)

האפליקציה מתקשרת באופן ישיר ובלעדי מול שרת ה-Backend (Node.js). היא אינה חשופה ישירות למסדי הנתונים מטעמי אבטחה.

## 🔗 חיבורים לתשתיות (Connections)
- **Base API URL**: משתנה סביבה `EXPO_PUBLIC_API_URL` (לרוב `http://localhost:3000` בפיתוח, או כתובת השרת ב-Production).
- **WebSockets / Socket.io**: האפליקציה פותחת ערוץ Socket קבוע מול ה-Backend לנתיב `/chat` כדי לקבל הודעות בזמן אמת ולעדכן את הסטייט ב-`useChatStore.ts`.
- **העלאת תמונות (Cloudinary)**: לעיתים האפליקציה עשויה לבצע העלאה ישירה (Unsigned Upload) דרך ה-Mobile אל Cloudinary (Upload Preset) כדי לחסוך עומס מה-Backend, או להעביר תמונה ל-Backend שיעלה אותה.

## 📂 מודולים וקשרים פנימיים
- **`src/services/api.ts`**: קובץ זה מכיל את מופע ה-Axios. כל הבקשות לשרת יוצאות מכאן. הוא גם שולף את טוקן ה-JWT מ-`expo-secure-store` ומצרף אותו ל-`Authorization: Bearer <token>` בכל בקשה.
- **`src/store/` (Zustand)**: הסטייט המקומי. מקבל נתונים מ-`api.ts` ומזין את המסכים השונים. לדוגמה, כאשר מתרחש Swipe, הסטייט מתעדכן מיידית (Optimistic UI) וברקע `api.ts` מודיע ל-Backend.
