# W7: Contracts, Payments & Maintenance (6 pages)

PLATFORM: Web Desktop (1440×900). Uses sidebar shell from W3.
DIRECTION: RTL (Hebrew). Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 6 pages. All actors (Tenant, Landlord, Admin, System). All states.

---

## Page 1 — Contracts List
- Header: "החוזים שלי" + "העלה חוזה" #00cba9 button
- 4 stat cards: פעילים green | ממתין yellow | פג בקרוב orange | הסתיימו gray
- Table: נכס | כתובת | שוכר/משכיר | תחילה | סיום | שכ"ד | סטטוס (colored badges) | פעולות (צפה | חתום | ⋯ dropdown: amendment, renew, PDF)
- Filters + pagination

## Page 2 — Contract Detail
- Breadcrumb + status banner (colored full width)
- Timeline: הועלה→ממתין→חתום שוכר→חתום משכיר→פעיל (dots, green/teal/gray)
- 2-col (60%+40%):
  - Left: info table (parties, dates, rent, deposit, CPI) + AI analysis card (if analyzed, Gemini results) + amendments list
  - Right: signatures card (preview or ⏳) + actions card (sign, verify, amend, PDF, renew) + KYC status card
- **States:** all statuses, signing modal (canvas + checkbox), amendment modal, KYC gate

## Page 3 — Contract Upload (3-step wizard)
- Step 1 UPLOAD: dashed zone 400×250 + cloud icon + "גרור או לחץ" + progress bar
- Step 2 AI ANALYSIS: loader "Gemini מנתח..." → editable fields (address, dates, rent, deposit, names) each with confidence badge (✓⚠✗) + "אשר"
- Step 3 ASSIGN: tenant search + guarantor email + "שלח לחתימה"
- **States:** upload, analyzing, results, editing, assigning, success, error

## Page 4 — Ledger
- Property selector + 4 summary cards (paid green | pending gray | overdue red | yearly total)
- Table: חודש | סכום | פירעון | תשלום | סטטוס (badges) | קבלה (thumbnail→lightbox) | פעולות
  - Tenant: "דווח תשלום" per pending row
  - Landlord: "אשר ✓" green / "דחה ✗" red per reported + countdown "אישור אוטומטי בעוד 36 שעות"
- Bar chart: 12-month history (green=paid, red=late)
- Report Payment modal (560px): month + amount + date + method dropdown + reference + receipt upload + notes + "שלח" + auto-confirm note

## Page 5 — Maintenance
- Header + "פתח תקלה" #00cba9 button
- Tabs: הכל | פתוח | בטיפול | נסגר + search + sort
- Table: # | קטגוריה (icon) | תיאור | נכס | נפתח | סטטוס | זמן (red >24h) | פעולות
- Side panel (slides left, 480px): ticket detail + status timeline + photos + comments thread
  - Tenant: "אשר סגירה" green / "לא טופל" red
  - Landlord: "אני מטפל" / "שלח טכנאי" / "midrag.co.il" link / upload invoice / close
  - Admin: force-close
- New ticket modal (600px): property dropdown + category 2×3 grid + title + description + urgency radio (low/med/high/urgent with colors) + photos (up to 5) + "שלח"

## Page 6 — Check-In / Check-Out
- Header + progress "4/6 חדרים" bar
- Room tabs (horizontal): rooms + "+ חדר". Active: #00cba9. Done: ✓
- 2-col: photo grid 3-col (60%) — thumbnails + ✗ + "+" + count | notes/rating (40%) — textarea + ⭐⭐⭐⭐⭐
- Check-out extra: side-by-side comparison with check-in photos + damage notes + condition badges
- Bottom: Tenant "שלח" / Landlord "אשר ✓" green + "בקש תיקון" orange + "סבב 1/3" counter
- **States:** photographing, submitted, reviewing, approved, fix-requested, auto-confirmed round 3
