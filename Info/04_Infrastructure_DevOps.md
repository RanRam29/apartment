# ☁️ תשתית, DevOps ו-Kubernetes

ניהול קנה המידה, הפריסה והאבטחה של המערכת כולה מתבצע בעזרת Docker Compose לסביבת פיתוח ו-Kubernetes לסביבת Production.

## 🐳 מבנה הרשת (Docker Compose)
קובץ `docker-compose.yml` קושר את הכל יחד ברשת וירטואלית אחת:
- **`postgres`**: מכולה מקומית בפורט `5432` (לפיתוח, במקום Neon).
- **`mongodb`**: מכולה מקומית בפורט `27017` (לפיתוח, במקום Atlas).
- **`redis`**: בפורט `6379`.
- **`kafka` & `zookeeper`**: מנוהלים יחד לאפשור התקשורת מבוססת-האירועים.
- **`backend`**: רץ בפורט `3000` ומוגדר כ-`depends_on` לכל מסדי הנתונים ו-Kafka, כלומר הוא ימתין לעלייתם (באמצעות `healthcheck`) לפני שיתחיל לרוץ.
- **`ai-service`**: רץ בפורט `8000`.

## 📦 Kubernetes (K8s) & Secrets Management
במעבר ל-Production, פרטי ההתחברות הרגישים המפורטים בקבצים האחרים מוכנסים לתוך אובייקטים מסוג `Secret`:

### `infrastructure/k8s/secrets.yaml`
קובץ זה (שאינו נדחף ל-Git אלא מנוהל ידנית או דרך תהליך CI/CD מאובטח) מכיל ב-Base64 את הערכים:
* `POSTGRES_URL` (מחרוזת ההתחברות של Neon)
* `MONGO_URI` (מחרוזת ההתחברות של Atlas)
* `GEMINI_API_KEY` (מפתח ה-AI)
* `CLOUDINARY_URL` (כתובת ואוטנטיקציה לענן התמונות)

ה-Deployments של ה-Backend וה-AI Service טוענים את הערכים האלו מתוך ה-Secret ישירות כמשתני סביבה אל תוך הקונטיינרים.
