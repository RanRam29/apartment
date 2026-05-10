# ADR: אסטרטגיית שירות AI — Node מול Python (`ai-service`)

| שדה | ערך |
|-----|-----|
| סטטוס | מאושר — משקף מצב קוד נוכחי |
| תאריך | 2026-05-10 |

## הקשר

קיימים שני מימושים הקשורים ל־Gemini ולמערכת ההמלצות:

1. **Backend (Node.js)** — [`backend/src/services/geminiService.js`](../backend/src/services/geminiService.js) קורא ישירות ל־Google Gemini (`gemini-1.5-flash`) עבור NLP וטקסט שיווקי.
2. **מיקרו־שירות Python** — [`ai-service/`](../ai-service/) (FastAPI) עם NLP דומה, סיכום דירה, דירוג דירות (`recommendation_engine`) וציון לידים (`lead_scoring`) — ללא LLM בחלק מהיכולות.

## החלטה

- **נתיב ייצור למוצר (מובייל)** נשאר **Node + Gemini ישיר** דרך `GEMINI_API_KEY` על שרת ה־Backend.
- **`ai-service`** נשאר כ**שירות אופציונלי** לפריסות שרוצות להריץ דירוג נומרי מתקדם או לאחד NLP בעתיד; אינטגרציה דרך משתנה `AI_SERVICE_URL` תיעשה רק כשתתוכנן במפורש (proxy ב־Backend או שינוי לקוח).

## נימוקים

- המובייל כבר משתמש ב־API של ה־Backend בלבד; אין תלות מוכחת ב־Python לפיצ'רים פעילים.
- כפילות קוד NLP בין Node ל־Python יוצרת עלות תחזוקה — להימנע ממנה עד שיש צורך עסקי מובהק (למשל העברת כל ה־AI לשירות אחד).
- דירוג דירות ולידים ב־Python מספקים ערך כשמחברים את השירות; עד אז ניתן לפורט לוגיקה ל־Node או לקרוא HTTP כשהשירות רץ.

## השלכות

- תיעוד ארכיטקטורה חייב להבהיר ש־HTTP ל־`ai-service` **אינו** חלק מהזרימה הנוכחית אלא אופציה.
- שינוי אסטרטגיה (למשל כל הקריאות דרך Python) ידרוש ADR חדש ועדכון [`AI_Capabilities_Current_State.md`](AI_Capabilities_Current_State.md).
