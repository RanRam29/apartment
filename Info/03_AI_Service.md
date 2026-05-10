# 🧠 שירות AI — Python (FastAPI)

מיקרו־סרביס אופציונלי ב-[`ai-service/`](../ai-service/) שמספק NLP, סיכום דירות, דירוג דירות וציון לידים.  
**נתיב הייצור העיקרי למובייל** הוא Backend ב-Node שקורא ל-Gemini ישירות — ראה [`AI_Capabilities_Current_State.md`](AI_Capabilities_Current_State.md) ו-[`ADR_AI_Service_Strategy.md`](ADR_AI_Service_Strategy.md).

## 🔗 חיבורים למערכות

### 1. Google Gemini API

מנוע השפה לפריסת שאילתות בשפה חופשית ולסיכומי דירות בתוך השירות ב-Python.

- מפתח API מוגדר במשתנה סביבה **`GEMINI_API_KEY`** (בפריסת השירות Python בלבד אם משתמשים בו).
- יצירת מפתח: [Google AI Studio / Cloud](https://aistudio.google.com/) — לא לאחסן מפתחות במסמכי Markdown ב-repo.

### 2. ממשקים פנימיים

- **MongoDB**: קריאת `UserPreferences` לדירוג דירות (`/api/recommendations/score`) כשהשירות רץ ומחובר.
- **Redis**: מטמון ל-NLP בזרימת FastAPI (אם מוגדר).
- **Kafka**: מתואר כיעד ארכיטקטוני עתידי ל-streaming אירועים — לא חובה להפעלת השירות הבסיסית.
