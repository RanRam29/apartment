# M7: Check-In & Check-Out (Tenant + Landlord + System)

PLATFORM: Mobile App (390×844). RTL Hebrew. Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 4 screens. Both actors. Used twice: check-in AND check-out. All states.

---

## Screen 1 — Check-In (Both actors)
- Header: "צ'ק-אין — רוטשילד 42" + status ("בתהליך" yellow / "הושלם ✓" green)
- Progress bar: "4/6 חדרים הושלמו" (#00cba9 fill)
- Room tabs (horizontal scroll): "מטבח" | "סלון" | "חדר שינה 1" | "חדר שינה 2" | "אמבטיה" | "מקלחת" | "+ חדר חדש". Active: #00cba9 underline. Done: ✓ green
- Current room:
  - Photo grid (3 columns, square): thumbnails + ✗ remove + expand. Last slot: "+" dashed + camera. Count: "7/20 תמונות"
  - Notes textarea: "...הערות לחדר זה"
  - Rating: ⭐⭐⭐⭐⭐ (1-5 tap)
- Bottom (sticky):
  - TENANT: "שמור → חדר הבא" outline + "שלח צ'ק-אין" #00cba9 (only when all rooms have ≥1 photo)
  - LANDLORD (after submit): "אשר צ'ק-אין ✓" green + "בקש תיקון" orange + counter "סבב 1/3"
- **States:** initial empty, photographing, room done, all done (submit active), submitted (waiting landlord), reviewing, approved (green "!צ'ק-אין אושר"), fix requested (orange "סבב 2/3"), auto-confirmed (blue "אושר אוטומטית" after round 3)

## Screen 2 — Check-Out (Both actors)
- Same structure as Check-In PLUS:
- Header: "צ'ק-אאוט — רוטשילד 42"
- Comparison mode: split view "צ'ק-אין" (left) | "צ'ק-אאוט" (right) per room
- Damage notes: textarea "...(תאר נזקים (אם יש"
- Condition change badge: "מצב השתפר ↑" green | "ללא שינוי =" gray | "נזק חדש ↓" red
- Same approve/fix-request flow with round counter
- **States:** same as check-in + comparison view, damage detected

## Screen 3 — Fix Request (TENANT receives)
- Push: "המשכיר ביקש תיקון — סבב 2/3"
- Room name: "מטבח"
- Landlord's note: "נא לצלם מקרוב את הכיור"
- Current photos grid
- "צלם תמונות נוספות" button → camera
- "שלח מחדש" button (#00cba9)
- Counter: "סבב 2/3 — אם לא יאושר, אישור אוטומטי בסבב הבא"
- **States:** loaded, adding photos, resubmitted, auto-confirmed (round 3)

## Screen 4 — Inspection Summary (Both actors, after completion)
- Header: "סיכום צ'ק-אין" / "סיכום צ'ק-אאוט"
- Green banner: "הושלם ✓"
- Per-room cards: room name + ✓ + "12 תמונות" + ⭐⭐⭐⭐⭐ + notes. Tap → expand photos
- "אושר בסבב 1/3" / "אושר אוטומטית בסבב 3/3"
- Timestamps: submitted + approved
- "הורד דוח PDF" button
- **States:** loaded, photo viewer, PDF download
