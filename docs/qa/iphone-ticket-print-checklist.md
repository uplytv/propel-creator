# iPhone Ticket Print QA Checklist (iframe fallback)

Use this on a real iPhone (Safari) to verify the iframe-based print fallback in
`EventPage.tsx` produces a crisp, scannable ticket QR.

## Prep
- [ ] iOS device updated (iOS 16+)
- [ ] Signed in with a confirmed ticket on an event
- [ ] AirPrint-capable printer reachable on the same Wi-Fi (or "Save to Files → PDF" as proxy)
- [ ] Pop-up blocker left at default (do NOT whitelist the site — we want the fallback path)

## Trigger the fallback
1. [ ] Open the event page → "View Ticket" → **Print Ticket**
2. [ ] In the print preview modal, tap **Print Now**
3. [ ] Confirm: a system print sheet appears (no new tab/window opens)
4. [ ] If nothing appears, the iOS help dialog shows up with Share → Print steps

## Visual checks in the iOS print preview
- [ ] Ticket is a single page, centered, ~78mm wide card
- [ ] Dashed border renders solid black (not gray / dotted)
- [ ] Event title, date, location, and 8-char code are all legible
- [ ] QR is square, ~52mm × 52mm, no aspect distortion
- [ ] QR edges are sharp — modules look like crisp squares, **not** blurred/anti-aliased
- [ ] Pinch-zoom into the preview: QR modules stay pixel-aligned (no gray halos)

## Print + scan
- [ ] Send to AirPrint printer (or "Save as PDF" → reopen)
- [ ] On the physical printout, scan the QR with the iPhone Camera app
- [ ] Scan succeeds on first try from ~20 cm away
- [ ] Repeat scan after folding the ticket in half lengthwise (real-world handling)

## Regression sweep
- [ ] Desktop Chrome: "Print Now" still opens a new window (not iframe)
- [ ] Desktop Safari: falls into iframe path, prints correctly
- [ ] Pop-up blocked in Chrome (block pop-ups in settings): iframe fallback engages, toast updates
- [ ] "Export as PDF" button still works from both the preview and the iOS help dialog

## Failure triage
| Symptom | Likely cause | Fix |
|---|---|---|
| QR blurry on paper | `image-rendering` not honored | Confirm `iframeFallback: true` is passed; check printer driver isn't downscaling |
| Card overflows page | `@page` margins ignored | Verify `@page { size: auto; margin: 12mm }` present in injected CSS |
| Border missing | Color adjust stripped | Confirm `-webkit-print-color-adjust: exact` is in print CSS |
| No print sheet on iOS | iframe `print()` raced before load | Increase the 350ms timer in `printViaIframe` |
