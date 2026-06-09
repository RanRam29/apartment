# M9: Landlord Dashboard & Listings

PLATFORM: Mobile App (390×844). RTL Hebrew. Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 4 screens. Landlord only. All states.

---

## Screen 1 — Dashboard (Landlord home tab)
- Header: "שלום, דוד 👋" + avatar (right RTL)
- ToS warning (if not accepted): yellow card "עליך לאשר תנאי שימוש" + "אשר"
- Trust Score widget: shield + "87/100" + bar + "→"
- "סקירה כללית" heading
- Metrics carousel (horizontal, 5 cards): "דירות: 3" cyan | "חוזים: 2" violet | "לידים: 7" orange | "תשלומים: 2" green | "תקלות: 1" red. Each tappable
- Quick actions (2×2 grid): "הוסף דירה" | "נהל לידים" | "צפה בחוזים" | "תשלומים"
- Recent activity (5 items): "ישראל דיווח תשלום — יוני" + timestamp
- **States:** loading, loaded, ToS warning, empty (new landlord)

## Screen 2 — Listings (Landlord tab)
- Header: "הנכסים שלי"
- Cards: image (full width, 160px) + title + address + price + status toggle "פעיל ✓" green / "לא פעיל" gray
- Stats: "👁 234" | "💚 12" | "👥 3"
- Buttons: "ערוך" | "שכפל" | "AI שיווק" | "שתף" | "מחק" (red, confirm dialog)
- AI marketing modal: style chips "מקצועי"|"ידידותי"|"יוקרתי" → loading → generated text → "העתק"/"שתף"
- FAB "+" → CreateListing
- **States:** loading, empty ("!הוסף דירה ראשונה"), populated, marketing modal, delete confirm

## Screen 3 — Create Listing
- Header: "הוסף דירה" + back
- ToS gate check
- Form: title (max 100) + description (max 1000) + price ₪ + building fee ₪ + rooms (stepper) + floor + total floors + sqm + city autocomplete + street autocomplete + house number
- Amenities (2-col checkboxes): 🅿️ חניה | 🛗 מעלית | 🌿 מרפסת | ❄️ מיזוג | 🐾 חיות | 🛡️ ממ"ד | 🪑 ריהוט | 📦 מחסן
- Images: horizontal scroll up to 10, "+" dashed → camera/gallery, thumbnails + ✗ + drag reorder, count "3/10"
- "פרסם דירה" button (#00cba9, 48px)
- **States:** empty, filling (validation), autocomplete dropdowns, uploading images, submitting, success ("!פורסמה 🎉"), errors

## Screen 4 — Edit Listing
- Same as Create, pre-populated
- Header: "ערוך דירה"
- "עדכן דירה" button
- "מחק מודעה" red link bottom → confirm
- **States:** loading data, editing, saving, success, delete confirm
