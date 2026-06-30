import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path("/tmp/browser/roster"); SHOTS.mkdir(parents=True, exist_ok=True)
SLUGS = ["omid", "morvarid", "andy"]
ROUTES = []
for s in SLUGS:
    ROUTES += [f"/{s}", f"/{s}-site", f"/{s}/blog", f"/{s}/community", f"/{s}/courses"]

async def main():
    fail = []
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        for r in ROUTES:
            errs.clear()
            resp = await page.goto(f"http://localhost:8080{r}", wait_until="domcontentloaded")
            await page.wait_for_timeout(1200)
            status = resp.status if resp else 0
            body = (await page.locator("body").inner_text()).lower()
            is_404 = "404" in body and ("not found" in body or "page not found" in body)
            title = await page.title()
            slug = r.strip("/").replace("/", "_") or "root"
            await page.screenshot(path=str(SHOTS / f"{slug}.png"))
            ok = status < 400 and not is_404 and not errs
            print(f"{'OK ' if ok else 'FAIL'} {r}  status={status}  404-body={is_404}  errs={len(errs)}  title={title!r}")
            if not ok:
                fail.append((r, status, is_404, errs[:2]))
        await b.close()
    if fail:
        print("\nFAILED:", fail); sys.exit(1)
    print("\nALL PASSED")

asyncio.run(main())
