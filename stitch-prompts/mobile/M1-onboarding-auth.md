# M1: Onboarding & Authentication Flow

PLATFORM: Mobile App (390×844, iPhone 14). RTL Hebrew. Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30, Error #ba1a1a

Build 7 screens. All screens required. All states required.

---

## Screen 1 — Splash
- Full screen, gradient #002045 → #1a365d
- DirApp logo centered (house icon + "דיראפ", white)
- Tagline: "הדרך החכמה למצוא דירה" (white, 16px)
- Loading spinner bottom
- **States:** loading (spinner), loaded (transitions out)

## Screen 2 — Onboarding Carousel (3 slides)
- Background #f8f9ff
- Progress pills top (3 dots, active = #00cba9)
- "דלג" skip link top-left
- Slide 1: Swipe illustration (240px) + "החלק ימינה לדירת חלומותיך" + "גלה דירות שמתאימות בדיוק לך עם AI חכם"
- Slide 2: Contract illustration + "חוזה דיגיטלי מאובטח" + "העלה, חתום, ונהל — הכל מהאפליקציה"
- Slide 3: Shield illustration + "אימות זהות ותשלומים בטוחים" + "KYC מובנה, לדג'ר תשלומים, ו-WhatsApp"
- "הבא" button (#00cba9, full width, 48px). Last slide: "!בואו נתחיל"
- **States:** slide 1/2/3 active

## Screen 3 — Login
- Tab selector: "התחברות" (active, #00cba9 underline) | "הרשמה"
- "!ברוך הבא" heading (Bold 28px, #002045)
- Email input (mail icon, placeholder "אימייל")
- Password input (lock icon, show/hide toggle)
- "?שכחת סיסמה" link (#00cba9, right-aligned)
- "התחבר" button (#00cba9, full width, 48px)
- **States:** empty, filled, loading (spinner), error (red border + "אימייל או סיסמה שגויים"), success

## Screen 4 — Register
- Tab selector: "הרשמה" active
- "הצטרף לדיראפ" heading
- Role toggle: "שוכר" | "משכיר" (pill, #00cba9 active)
- Inputs: First Name, Last Name, Email, Phone (+972), Password (+ strength meter: weak red, medium yellow, strong green), Confirm Password
- Checkbox: "אני מסכים/ה לתנאי השימוש ומדיניות הפרטיות"
- "הרשם" button
- **States:** empty, filling (real-time validation), password mismatch, email taken, loading, success

## Screen 5 — Email Verification
- Centered on #f8f9ff
- Animated envelope icon (120px)
- "בדוק את המייל שלך" title (Bold 24px)
- "שלחנו קוד אימות ל-" + email bold
- 6-digit code: 6 boxes (48×56px), auto-focus next
- Timer: "שלח שוב בעוד 0:45" (gray) → "שלח שוב" (#00cba9 at 0:00)
- "אמת" button
- **States:** waiting, timer running, timer expired, invalid code (shake + red), verifying, success (green ✓)

## Screen 6 — Preferences Wizard (Tenant, 4 steps)
- Progress dots top (4)
- Step 0: 👋 "!ברוך הבא לדיראפ" + "נתאים לך דירות בול בשבילך" + "בוא נתחיל" button
- Step 1: 💰 "?מה התקציב שלך" + min/max sliders ₪1,000–₪15,000 + הבא/חזרה
- Step 2: 🏙️ "?איפה מחפש" + multi-select city chips (תל אביב, ירושלים, חיפה, באר שבע, etc.)
- Step 3: 🎉 "!מעולה! הכל מוכן" + "הדירות כבר מחכות לך" + "!יאללה" button → Swipe
- **States:** each step active, completed steps show green ✓

## Screen 7 — Terms of Service
- Header: "תנאי שימוש" + back button
- Scrollable text area (Hebrew legal placeholder)
- Sticky bottom: "אישור והמשך" button (#00cba9)
- **States:** scrolling, scrolled to bottom (button enables), accepted
