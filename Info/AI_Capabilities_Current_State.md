# אפיון יכולות AI במערכת (מצב נוכחי)

מסמך זה משקף את הקוד ב-repository נכון לייצוג תכולת AI זמינה במוצר.  
להחלטות ארכיטקטורה (Node מול `ai-service`): [`ADR_AI_Service_Strategy.md`](ADR_AI_Service_Strategy.md).

## ארכיטקטורה כללית

```mermaid
flowchart LR
  subgraph mobile [Mobile Expo]
    Search[SearchScreen NLP]
    Chatbot[ApartmentSearchChatbot NLP]
    Listings[ListingsScreen marketing]
  end
  subgraph backend [Node Backend]
    GeminiSvc[geminiService.js]
    Rec[recommendations routes]
    Apt[apartments routes]
  end
  subgraph llm [Google Gemini API]
    Flash[gemini-1.5-flash]
  end
  subgraph optional [Python ai-service optional]
    FastAPI[FastAPI /api/nlp /api/recommendations]
    Heuristics[sklearn heuristics no LLM]
  end
  Search --> Rec --> GeminiSvc --> Flash
  Chatbot --> Rec --> GeminiSvc
  Listings --> Apt --> GeminiSvc
  FastAPI --> Flash
  Heuristics -.-> FastAPI
```

- **נתיב ייצור ראשי לאפליקציה**: ה-Backend ב-[`backend/src/services/geminiService.js`](../backend/src/services/geminiService.js) קורא ישירות ל-**Google Gemini 1.5 Flash** (`generateContent`). תלות: משתנה סביבה **`GEMINI_API_KEY`**.
- **מיקרו־שירות Python** [`ai-service/`](../ai-service/) (FastAPI): מכיל אותה לוגיקת NLP/summary דרך Gemini **ומנועי דירוג נומריים** (לא LLM). בקוד ה-Backend **לא נמצאה** קריאה HTTP ל-`AI_SERVICE_URL` — המפתח מופיע ב-[`backend/.env.example`](../backend/.env.example) כהכנה לעתיד, אך האינטגרציה הפעילה למובייל עוברת דרך Node.

---

## 1. NLP לחיפוש חופשי (Tenant)

| רכיב | תיאור |
|------|--------|
| **מה עושה** | הופך שאילתת טקסט חופשי (עברית/אנגלית) ל-**JSON מסונן**: עיר, שכונה, טווח מחירים, חדרים, amenities מוגדרים, חיות, תאריך כניסה. |
| **מודל** | Gemini 1.5 Flash, `temperature: 0.1`, עד 256 טוקנים. |
| **כשל, JSON לא תקין או ללא מפתח** | **שכבת היוריסטיקה** (`inferFiltersFromQuery` ב-[`geminiService.js`](../backend/src/services/geminiService.js)): זיהוי ערים נפוצות, דפוסי חדרים/מחיר בעברית, מילות מפתח ל-amenities וחיות. התוצאה **ממוזגת** עם פלט Gemini (`mergeParsedFilters`) — ערכי LLM גוברים על קונפליקטים; חסרים משלימים מההיוריסטיקה. ללא מפתח: חיפוש עדיין מסונן לפי מה שניתן לחלץ מהטקסט. |
| **API** | `POST /api/recommendations/search` — דורש tenant מאומת; **הגבלת קצב** (`geminiSearchLimiter`); מיזוג overrides מה-body (city, maxPrice וכו'); **Redis cache** לפילטרים לפי שאילתה (מפתח עם גרסה, למשל `nlp:v3:…`, TTL ~5 דק'); שמירת היסטוריה ב-**MongoDB** `UserPreferences.nlpSearchHistory` (fire-and-forget); שאילתת Postgres על דירות פעילות, **לא כולל** דירות שכבר נוצפו ב-swipe. |
| **קוד** | [`backend/src/routes/recommendations.js`](../backend/src/routes/recommendations.js), [`backend/src/services/geminiService.js`](../backend/src/services/geminiService.js) — `parseSearchQuery`, `inferFiltersFromQuery`, `mergeParsedFilters`. |
| **מובייל** | [`mobile/src/screens/SearchScreen.tsx`](../mobile/src/screens/SearchScreen.tsx) — `recommendationsApi.nlpSearch`, ממשק "מחפש עם AI"; [`mobile/src/components/ApartmentSearchChatbot.tsx`](../mobile/src/components/ApartmentSearchChatbot.tsx) — אותו API בצ'אט צף לשוכרים. |

**הערה**: ההמלצות ה"מותאמות אישית" ב-`GET /api/recommendations/personalized` **אינן מבוססות LLM** — הן מסננות לפי העדפות שמורות ב-Mongo + swipe history, עם מיון/מגבלות ב-Sequelize ([`recommendations.js`](../backend/src/routes/recommendations.js)).

---

## 2. יצירת טקסט שיווקי לדירה (Landlord)

| רכיב | תיאור |
|------|--------|
| **מה עושה** | יוצר **2–3 משפטים בעברית** לתיאור מודעה לפי נתוני דירה (עיר, חדרים, מחיר, שטח, קומה, amenities, חיות). |
| **סגנונות** | `professional` \| `friendly` \| `luxury` — הנחיות טון שונות ב-[`COPY_STYLE_INSTRUCTIONS`](../backend/src/services/geminiService.js). |
| **מודל** | Gemini Flash, `temperature: 0.75`, עד 160 טוקנים. |
| **API** | `POST /api/apartments/:id/marketing-copy` — בעלים בלבד; **Redis cache** לפי דירה+סגנון (10 דקות); ללא מפתח או כשל API → **503** עם הודעה על `GEMINI_API_KEY`. |
| **קוד** | [`backend/src/routes/apartments.js`](../backend/src/routes/apartments.js) (נתיב `/:id/marketing-copy`), [`geminiService.js`](../backend/src/services/geminiService.js) `generateMarketingCopy` / `generateListingSummary`. |
| **מובייל** | [`mobile/src/screens/ListingsScreen.tsx`](../mobile/src/screens/ListingsScreen.tsx) — מודאל לבחירת סגנון ויצירת טקסט, התראה אם אין מפתח בשרת. |

---

## 3. העדפות משתמש וטקסט שיווקי במובייל (ללא LLM עצמאי)

- **שמירה/טעינת העדפות** (`POST/GET /api/recommendations/preferences`): נתונים בלבד, ללא AI — משמש את ההמלצות האישיות והקשר ל-onboarding ([`PreferencesScreen.tsx`](../mobile/src/screens/PreferencesScreen.tsx), [`OnboardingScreen.tsx`](../mobile/src/screens/OnboardingScreen.tsx)).
- טקסט ב-onboarding כמו "AI מתאים לך לפי ההעדפות" מתאר את **הזרימה מבוססת-העדפות**, לא קריאת LLM נפרדת.

---

## 4. שירות Python `ai-service` (כפילות / הרחבה אופציונלית)

הפעלה נפרדת ([`ai-service/app.py`](../ai-service/app.py)):

| נתיב | יכולת |
|------|--------|
| `POST /api/nlp/parse` | אותו רעיון כמו `parseSearchQuery` — Gemini + Redis cache. |
| `POST /api/nlp/summary` | סיכום שיווקי בעברית — מקביל ל-`generate_listing_summary` ב-[`nlp_search.py`](../ai-service/src/nlp_search.py). |
| `POST /api/recommendations/score` | **דירוג נומרי** של רשימת דירות: numpy + התאמה להעדפות + boost התנהגותי לפי swipe — **לא מודל שפה** ([`recommendation_engine.py`](../ai-service/src/recommendation_engine.py)). |
| `POST /api/leads/score` (ראה [`lead_scoring.py`](../ai-service/src/lead_scoring.py)) | ציון לידים של משכירים לפי תקציב, סוג swipe, זמן צפייה, אימות, עיר — **כללי ניקוד**, לא LLM. |

עד כה ה-Backend הראשי **לא מפנה** אליו בקוד המקור שנסרק — כלומר השימוש בפועל באפליקציה הנוכחית הוא דרך **Node + Gemini** לעיל.

---

## 5. מה שאינו AI / גבולות

- **צ'אט בין משתמשים**: לא זוהה שימוש ב-LLM בנתיבי צ'אט ב-backend במסגרת הסריקה (התמקדנו ב-Gemini והשירותים לעיל).
- **מסמכי Info**: [`03_AI_Service.md`](03_AI_Service.md) מתאר ארכיטקטורה ו-Kafka; יש לטפל בו כמסמך תיאורי בלבד — **אין להעתיק מפתחות או פרטי סוד מהמסמך**.

---

## סיכום טבלה

| יכולת | LLM? | איפה בפועל (אפליקציה) |
|--------|------|-------------------------|
| חיפוש בשפה טבעית | כן (Gemini) + היוריסטיקה | Backend `recommendations/search`; מובייל Search + Chatbot |
| המלצות מותאמות אישית | לא | Mongo prefs + SQL |
| טקסט שיווקי למודעה | כן (Gemini) | Backend `apartments/.../marketing-copy` |
| דירוג דירות מתקדם (numpy) | לא | רק ב-`ai-service` אם מופעל בנפרד |
| ציון לידים | לא | רק ב-`ai-service` |
