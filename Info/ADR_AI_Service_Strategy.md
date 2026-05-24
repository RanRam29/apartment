# ADR: אסטרטגיית שירות AI — Node מול Python (`ai-service`)

| שדה | ערך |
|-----|-----|
| סטטוס | מאושר — משקף מצב קוד נוכחי |
| תאריך | 2026-05-10 |

## הקשר

קיימים שני מימושים הקשורים ל־Gemini ולמערכת ההמלצות:

1. **Backend (Node.js)** — [`backend/src/services/geminiService.js`](../backend/src/services/geminiService.js) קורא ישירות ל־Google Gemini (**`gemini-flash-latest`** by default, override via `GEMINI_MODEL`) עבור NLP וטקסט שיווקי.
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

## מימוש (AI-011, 2026-05-23)

- **Gemini / NLP / marketing copy** — ללא שינוי; Node + `GEMINI_API_KEY`.
- **דירוג נומרי** — מימוש Node ב-[`backend/src/services/leadScoringService.js`](../backend/src/services/leadScoringService.js) ו-[`recommendationEngineService.js`](../backend/src/services/recommendationEngineService.js).
- **Proxy אופציונלי** — [`backend/src/services/aiServiceClient.js`](../backend/src/services/aiServiceClient.js) מנסה `AI_SERVICE_URL` לנתיבי `/api/leads/score` ו-`/api/recommendations/score`; בכשל — fallback ל-Node.
- **API חדש/מורחב ב-Backend**:
  - `POST /api/leads/score` (landlord)
  - `POST /api/recommendations/score` (tenant)
  - `GET /api/landlord/leads` — מחזיר `leadScore` וממיין לפי ציון
  - `GET /api/recommendations/personalized` — משתמש במנוע דירוג Node (או proxy)
