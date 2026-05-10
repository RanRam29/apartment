# Web bundle (Metro) — לא לשמור ב־Git

`tmp-deployed.js` (או כל שם דומה) הוא **פלט minify של Metro** ל־Expo Web — קובץ בן מגה־בתים שנוצר אחרי `expo export`.  
אין לשמור אותו ב־repo: מנופח, לא ניתן ל־review, ונבנה מחדש בכל build.

## ליצור מחדש bundle סטטי ל־web

מתוך תיקיית `mobile/`:

```bash
npm run export:web
```

הפלט מופיע לרוב תחת `dist/` (או לפי הגדרות `app.json` / `expo export`).  
להעלות ל־hosting: תוכן `dist/` בלבד, לא קובץ ידני בשורש.

## פיתוח מקומי

```bash
npm run web
```

מפעיל dev server — לא bundle מינימלי.
