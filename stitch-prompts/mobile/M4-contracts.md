# M4: Contract Lifecycle (Landlord + Tenant + Guarantor + Admin)

PLATFORM: Mobile App (390×844). RTL Hebrew. Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 8 screens. Multiple actors. All states required.

---

## Screen 1 — Contracts List (Both actors)
- Header: "החוזים שלי" + FAB "+" (#00cba9, bottom-right, landlord only)
- Cards: property thumbnail (60×60) + address + dates "01.07.2026–30.06.2027" + rent "₪4,500/חודש"
- Status badge: "טיוטה" gray | "ממתין לחתימה" yellow | "פעיל ✓" green | "פג בקרוב ⚠️" orange | "הסתיים" red
- Progress bar: thin bar showing timeline position (green fill)
- **States:** loading, empty ("אין חוזים"), populated, error

## Screen 2 — Contract Upload (LANDLORD, 3 steps)
**Step 1 — Upload:** dashed zone (full width, 200px) + cloud icon + "גרור קובץ או לחץ" + "PDF, DOCX — עד 10MB" → file name + size + progress bar + "העלה ונתח" button
**Step 2 — AI Analysis:** animated loader "...AI מנתח את החוזה" → results: extracted fields as editable form (address, dates, rent, deposit, names) each with confidence badge (✓ green high / ⚠ yellow / ✗ red low) + "אשר פרטים" button
**Step 3 — Assign:** "הזמן שוכר" search input + "הזמן ערב" email input + "שלח לחתימה" button
- **States:** initial, file selected, uploading, analyzing, results, editing, assigning, sending, success ("!החוזה נוצר"), error

## Screen 3 — Contract Detail (Both actors)
- Status banner (full width, colored): "פעיל — בתוקף עד 30.06.2027" green / "ממתין לחתימתך" yellow
- Property image (200px)
- Info card: משכיר | שוכר | תחילה | סיום | שכ"ד ₪4,500 | פיקדון ₪9,000 | הצמדת מדד כן
- Timeline (horizontal dots): הועלה → ממתין → חתום שוכר ✓ → חתום משכיר ✓ → פעיל. Green=done, teal=current, gray=future
- Signatures: landlord (preview or "ממתין ⏳") + tenant (same) + guarantor (status)
- KYC per party: "מאומת ✓" green / "ממתין" yellow / "נכשל" red
- Actions by state:
  - PENDING_SIGN: "חתום על החוזה" (#00cba9)
  - ACTIVE: "אמת בעלות" + "הצע תיקון" + "הורד PDF"
  - EXPIRING: "חדש חוזה" + "הורד PDF"
- Amendments section: list + "הצע תיקון חדש" link
- **States:** loading, all statuses, KYC gate blocked, signing modal, amendment modal

## Screen 4 — Digital Signature (modal overlay)
- KYC gate: if not verified → "עליך לעבור אימות זהות" + "עבור לאימות" button
- If verified: "חתימה דיגיטלית" heading + contract summary + checkbox "קראתי ומסכים/ה" + signature canvas (full width, 150px, "חתום כאן" placeholder, "נקה" link) + "חתום ואשר" button (disabled until checkbox + signature) + "ביטול" link
- **States:** KYC blocked, ready, drawing, signed success ("!החוזה נחתם ✓"), error

## Screen 5 — Propose Amendment (modal)
- "הצע תיקון לחוזה" heading
- Contract ref: "רוטשילד 42 — חוזה פעיל"
- Description textarea (max 500)
- Category chips: "שכ"ד" | "תאריכים" | "תנאים" | "אחר"
- "שלח הצעה" button. Note: "ההצעה תישלח לצד השני"
- **States:** empty, filling, sending, success, max reached (10)

## Screen 6 — Amendment Review (other party)
- Amendment card: category badge + description + proposed by + date
- "אשר תיקון ✓" green + "דחה תיקון ✗" red outline + "שלח הודעה" outline
- **States:** loaded, approving, rejecting, approved, rejected

## Screen 7 — KYC / Verify Identity (Both actors)
- Header: "אימות זהות" + shield
- Status card: "לא אומת" red / "בתהליך" yellow / "מאומת ✓" green + date
- 3 steps (vertical): 1. "צלם תעודת זהות" 2. "צלם סלפי" 3. "המתן לאישור" — current=#00cba9, done=green, future=gray
- "התחל אימות" button (#00cba9) → launches Persona
- Info: "האימות לוקח עד 24 שעות"
- IF REJECTED: red card + reason + "נסה שוב"
- IF TIMEOUT: "פג הזמן" + "התחל חדש"
- **States:** not started, in progress, approved, rejected (+ reasons), timeout

## Screen 8 — Ownership Verification (TENANT only)
- "אימות בעלות" heading + explanation
- Checkboxes: "ראיתי נסח טאבו" | "ראיתי חוזה קודם" | "דיברתי עם ועד הבית" | "אחר" + text
- "אשר בעלות" button
- **States:** form, confirmed, already verified
