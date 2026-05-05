# 🧠 שירות AI - Python (Flask/FastAPI)

מיקרו-סרביס זה קורא נתונים (מ-DB או מ-Kafka), מנתח אותם, ומחזיר תובנות אל ה-Backend.

## 🔗 חיבורים למערכות (Connections)

### 1. Google Gemini API
מנוע השפה (LLM) שמפענח בקשות כמו "דירה לזוג פלוס כלב בתל אביב עם חלונות גדולים" או מסכם תיאורי דירות.
- **Project Name/Number**: `projects/291241351035`
- **שם מפתח**: `apartment_gemini_api`
- **API Key**: `AlzaSyC0epluUa9Rh8B_efB1NQBrnQj8z6GO9f8`

### 2. ממשקים לשירותים פנימיים
- **חיבור ל-MongoDB / PostgreSQL**: לרוב סרוויס כזה אמור לגשת לנתונים לקריאה בלבד (Read-Only) מ-Mongo כדי למשוך `UserPreferences` ולבצע התאמות.
  - הוא חולק את אותו Connection String של ה-Backend לגישה למסדי הנתונים.
- **חיבור ל-Kafka (Consumer)**: האפליקציה מאזינה ל-Broker ב-`kafka:9092` ולוקחת `Swipe Events` כדי לעדכן פרופילי משתמש בזמן אמת ולדייק את מנוע ההמלצות (`recommendation_engine.py`).
- **חיבור ל-Redis**: נעזר ברדיס כאחסון ביניים לעדכון "דירוג איכות ליד" (`lead_scoring.py`) בצורה סופר-מהירה כך שה-Backend יוכל לשלוף אותו מיידית עבור דאשבורד המשכירים.
