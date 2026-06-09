# W2: Web Authentication (3 pages)

PLATFORM: Web Desktop (1440×900). Split-screen layout. NO sidebar.
DIRECTION: RTL (Hebrew). Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 3 pages. All states.

---

## Page 1 — Login (split 50/50)
**RIGHT HALF** (#002045 gradient): DirApp logo white + "הדרך החכמה לשכור דירה" + apartment illustration + 3 rotating feature cards
**LEFT HALF** (white, centered 400px form):
- "ברוך הבא" H2 + "התחבר לחשבון שלך" gray subtitle
- Email input (mail icon) + Password input (lock + show/hide)
- Row: "זכור אותי" checkbox ↔ "?שכחת סיסמה" #00cba9 link
- "התחבר" button (#00cba9, full width, 48px)
- Divider "—— או ——" + Google button (outline)
- "?אין חשבון — הרשם כאן" link
- **States:** empty, filled, loading, error ("אימייל או סיסמה שגויים"), success

## Page 2 — Register (split 50/50)
Same split. LEFT form:
- "צור חשבון חדש" H2
- Role toggle: "שוכר" | "משכיר" (#00cba9 pill active)
- 2-col: First + Last name
- Email + Phone (+972) + Password (strength meter) + Confirm
- Checkbox: "מסכים ל-תנאי שימוש ומדיניות פרטיות" (links)
- "צור חשבון" button + "?יש חשבון — התחבר"
- **States:** empty, filling, mismatch, email taken, loading, success

## Page 3 — Email Verification (centered, no split)
- #f8f9ff bg, white card (480px, centered, shadow)
- Animated envelope (120px) + "אמת את האימייל שלך" H2
- "שלחנו קוד ל-" + email bold
- 6 code boxes (48×56px, auto-focus)
- Timer: "שלח שוב בעוד 0:45" → "שלח שוב" link at 0
- "אמת" button + "שנה אימייל" link
- **States:** waiting, timer, expired, invalid (shake+red), verifying, success
