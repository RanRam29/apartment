# W6: Discovery, Matches & Chat (5 pages)

PLATFORM: Web Desktop (1440×900). Uses sidebar shell from W3.
DIRECTION: RTL (Hebrew). Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 5 pages inside app shell. All actors. All states.

---

## Page 1 — Swipe View
- Center (640px): large card — image 640×400, gradient overlay, price + address + specs + chips + compatibility + Trust Score
- Below: 3 buttons (72px circles) ❌ ⭐ 💚 + keyboard hints "← דלג | → אהבתי | ↑ סופר"
- Right panel (320px): next 3 apartments mini cards
- **States:** loading, swiping, empty, quota modal, match modal

## Page 2 — Search Grid
- Sticky filter bar: location multi-select | price dual slider | rooms | more filters | NLP toggle ("חיפוש חכם AI" → text input) | view toggle grid/list/map | sort dropdown
- 3-col grid (4 rows/page): image 200px + hover lift + heart favorite + price badge + address + rooms/size + True Monthly Cost + landlord mini + "פרטים"/"אני מעוניין" buttons
- Count "נמצאו 127" + pagination « 1 2 3 ... »
- **States:** loading, results, empty, NLP active (AI badge)

## Page 3 — Apartment Detail (full width)
- Gallery: main 800×450 + 4 thumbnails → lightbox
- 2-col (65%+35%):
  - Left: H1 address + tags + description + True Monthly Cost table (rent+arnona+vaad=total) + features grid 4-col (✓/✗) + map embed + TAMA38
  - Right (sticky): landlord card (avatar + name + Trust Score + response time + "שלח הודעה") + compatibility card + CTA ("₪4,500/חודש" + "אני מעוניין/ת" #00cba9 + "שמור" + "דווח")
- **States:** loading, loaded, owner view, already liked

## Page 4 — Matches (toggle cards/table)
- Tabs: "ממתין" | "אושר" | "נדחה" + view toggle
- Cards 3-col: image + address + price + compatibility + status + actions
- Table: sortable columns, row hover
- Landlord: approve ✓ / reject ✗ buttons on pending + confirm dialogs
- **States:** loading, empty, populated, confirms

## Page 5 — Chat (3-panel)
- LEFT (320px): conversations list — search + items (avatar + online dot + name bold/normal + preview + time + unread badge + active=#e5eeff bg)
- CENTER (flex): header (avatar + name + status + ⋯) + property banner (mini card) + messages (sent: right #00cba9 bubbles, received: left #eff4ff, dates, read receipts ✓✓, typing dots) + input bar (📎 + text + send #00cba9 circle)
- RIGHT (280px, collapsible): property image + address + contact + shared files + "חסום" red link
- **States:** loading, empty inbox, conversation active, typing, sending, message states
