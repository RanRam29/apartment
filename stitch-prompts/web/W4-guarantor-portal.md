# W4: Guarantor Verification Portal (Standalone)

PLATFORM: Web Desktop (1440×900). STANDALONE — NO sidebar, NO login.
DIRECTION: RTL (Hebrew). Font: Rubik. Accessed via secure unique link.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 1 page with 3 wizard steps + 4 end states. ALL required.

---

## Right Half (50%, #002045 gradient, FIXED)
- DirApp logo white (top)
- Contract summary card (white, 400px, centered):
  - "סיכום חוזה שכירות" heading
  - Property image (200px, rounded)
  - Badge "#DIR-{token}"
  - Grid 2×2: "המשכיר: דוד כהן" | "השוכר: ישראל ישראלי" | "שכירות: ₪4,500/חודש" | "תקופה: 01.07.2026–30.06.2027"
  - Legal box (border-right 4px blue): "הצהרת ערבות" + obligation text
- "🔒 SSL 256-bit" + "⏳ תוקף: 5 ימים" badges
- Countdown: "הקישור יפוג בעוד 4 ימים, 12 שעות"

## Left Half (50%, white, scrollable)
- Stepper: ① סקירה → ② אימות זהות → ③ חתימה. Done=green ✓, current=#00cba9, future=gray

### Step 1 — Contract Review
- Badge "1" + "סקירת פרטי החוזה" H2
- Greeting: "שלום, {name}. הוזמנת להיות ערב..."
- Warning card: ⚖️ "אישור = חתימה מחייבת בעלת תוקף משפטי"
- Inputs: full name + Israeli ID (9 digits, checksum validation) + phone + email
- Checkbox: "אני מאשר שקראתי את פרטי החוזה"
- Buttons: "דחה הזמנה" red outline ← | "→ המשך לאימות" #00cba9

### Step 2 — Identity Verification
- Badge "2" + "אימות זהות" H2
- 2-col upload zones: "צד קדמי" + "צד אחורי" — dashed, camera icon, drag/click → preview + ✗
- Security card: 🛡️ "AES-256 מוצפן. נמחק אחרי 7 ימים."
- Buttons: "← חזרה" | "→ המשך לחתימה" (disabled until valid ID + both photos)
- KYC overlay (on continue): loading "...בודק זהות" (2s) → success "!הזהות אומתה" (1.5s) → auto Step 3

### Step 3 — Signature & OTP
- Badge "3" + "חתימה דיגיטלית" H2
- Legal scroll box (200px, bordered, Hebrew legal text)
- Hash card: 🔐 "SHA-256: 8f2b3e..." monospace
- Signature canvas (480×150px): "חתום כאן" placeholder, blue ink #005db6, "נקה" link
- OTP: "שלח קוד לנייד" button → 6 boxes (single digit, auto-focus) + timer 59s → "שלח מחדש"
- Consent checkbox: "מסכים לתנאי הערבות ומאשר חתימה"
- Buttons: "← חזרה" | "✓ אישור וחתימה" (disabled until OTP + signature + consent)

### End State — DECLINED
- Centered: ❌ red icon + "הבקשה נדחתה" H2 + "הודעה נשלחה למשכיר" + "סגור" button

### End State — SIGNED
- Centered: ✅ green animation + "!הערבות נחתמה בהצלחה" H2 + "עותק ישלח למייל" + summary + "סגור"

### End State — ERROR (invalid/expired token)
- Centered: ⚠️ icon + "שגיאה בגישה לחוזה" H2 + error message + "חזור לדף הבית"

### LOADING State
- Centered spinner + "...טוען פרטי הזמנה מאובטחת"
