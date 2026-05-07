# iPhone QR Scan Test Procedure

Companion to `iphone-ticket-print-checklist.md`. Run after a fresh AirPrint of the
ticket from the iframe fallback. Goal: confirm the printed QR is reliably scannable
in real check-in conditions.

## Equipment
- iPhone (iOS 16+) with the **Camera** app and **Code Scanner** in Control Center
- Freshly printed ticket on plain white A4 / Letter (no glossy paper)
- Tape measure or ruler (cm)
- Lighting: one indoor test, one dim test (~50 lux, "bar lighting")

## Setup
1. Place the ticket flat on a non-reflective surface
2. Hold the iPhone parallel to the ticket (no tilt > 15°)
3. Disable iPhone flash for all tests except the dim retry

## Scan matrix

| # | Distance | Angle | Light | Action | Pass criteria |
|---|----------|-------|-------|--------|---------------|
| 1 | 10 cm | 0° (flat) | Bright indoor | Open Camera, point at QR | Yellow URL banner appears in **≤ 1.0 s** |
| 2 | 20 cm | 0° | Bright indoor | Same | Banner in **≤ 1.5 s** |
| 3 | 30 cm | 0° | Bright indoor | Same | Banner in **≤ 2.0 s** |
| 4 | 50 cm | 0° | Bright indoor | Same | Banner in **≤ 3.0 s** (acceptable) |
| 5 | 20 cm | 30° tilt | Bright indoor | Tilt phone right | Banner in **≤ 2.0 s** |
| 6 | 20 cm | 0° | Dim (~50 lux) | No flash | Banner in **≤ 3.0 s** |
| 7 | 20 cm | 0° | Dim (~50 lux) | Flash ON | Banner in **≤ 2.0 s** |
| 8 | 20 cm | 0° | Bright indoor | Fold ticket in half lengthwise, then unfold | Banner in **≤ 2.0 s** |
| 9 | 20 cm | 0° | Bright indoor | Crumple lightly, smooth out | Banner in **≤ 3.0 s** |
| 10 | 20 cm | 0° | Bright outdoor (sun) | Same | Banner in **≤ 2.0 s** |

## Confirmation step (every successful scan)
- [ ] Tap the yellow banner — opens the ticket URL in Safari
- [ ] URL contains the correct `qr_code_token` (matches first 8 chars on the printed code line)
- [ ] No "This site can't be reached" error

## Overall pass criteria
- **Tests 1–3, 5, 7, 8, 10 must pass** (must-have scenarios)
- Tests 4, 6, 9 are stretch — failures here are notes, not blockers
- Zero false reads (a successful scan must resolve to *this* ticket's token, not a previous one)

## If a must-have test fails
1. Re-screenshot the printed QR with the iPhone Camera; zoom to 200% — modules should be sharp squares
2. If blurry on screen too → printer/driver issue; try "Best" / "Photo" quality
3. If sharp on screen but slow to scan → QR error correction may be too low. Confirm `level="H"` is set on the `<QRCodeSVG>` in `EventPage.tsx`
4. If scan resolves to wrong token → cache invalidation bug; force-refresh the ticket via the regenerate button and reprint

## Logging template
```
Date:           ____
iOS version:    ____
Printer model:  ____
Paper:          plain / glossy / thermal
Pass count:     __ / 10
Failures:       (test #, reason)
```
