# 📊 ניטור, לוגים וזמינות (Observability)

כדי לנהל פלטפורמה אמינה, חובה לדעת על בעיות לפני שהמשתמשים מדווחים עליהן.

## 1. ניטור צד לקוח (Mobile)
* **Sentry / Crashlytics**: מוטמע באפליקציית ה-Expo תופס קריסות של האפליקציה (Crashes) ושגיאות ב-UI, ומספק Stack Trace מלא.
* **Network Logs**: רישום שגיאות רשת (למשל כשה-Backend לא זמין) יחד עם פרטי המכשיר והגרסה.

## 2. ניטור שרתים (Backend & AI)
* **Centralized Logging (ELK/Datadog)**: כל הלוגים מה-Node.js וה-Python נאספים למקום אחד. משתמשים בספריית הלוגים `Winston` (בנוד) שמוציאה פלט מובנה ב-JSON.
* **APM (Application Performance Monitoring)**: ניטור זמני תגובה. במיוחד חשוב לנטר כמה זמן לוקח ל-AI Service לענות, שכן חישובי ה-NLP מול Gemini עלולים ליצור צווארי בקבוק.

## 3. Kubernetes Health Checks
* **Liveness Probes**: ה-K8s מריץ פינגים קבועים לשרתים (למשל `GET /health`). אם השרת תקוע ולא עונה, ה-K8s משמיד אותו ומרים קונטיינר חדש אוטומטית.
* **Readiness Probes**: מוודא שהשרת סיים להתחבר ל-DB ול-Kafka לפני שהוא מפנה אליו תעבורת רשת של משתמשים.
