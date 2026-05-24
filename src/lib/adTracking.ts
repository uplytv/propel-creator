/**
 * Ad Tracking Utilities
 * Injects Meta Pixel and Google Tag scripts and fires conversion events.
 */

// ─── Meta Pixel ───

let metaPixelLoaded = false;

// Meta pixel IDs are numeric strings only.
const META_PIXEL_ID_RE = /^\d{6,20}$/;
// Google tag IDs look like GTM-XXXX, G-XXXXXXXX, AW-XXXXXXX, UA-XXXXXX-X, DC-XXXXXX
const GOOGLE_TAG_ID_RE = /^[A-Z]{1,4}-[A-Z0-9-]{4,30}$/;

export function initMetaPixel(pixelId: string) {
  if (metaPixelLoaded || !pixelId) return;
  if (!META_PIXEL_ID_RE.test(pixelId)) {
    console.warn("[adTracking] Invalid Meta pixel ID format; refusing to load");
    return;
  }
  metaPixelLoaded = true;

  // pixelId validated as digits-only above; JSON.stringify safely encodes it.
  const script = document.createElement("script");
  script.text = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', ${JSON.stringify(pixelId)});
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);

  // noscript fallback
  const noscript = document.createElement("noscript");
  const img = document.createElement("img");
  img.height = 1;
  img.width = 1;
  img.style.display = "none";
  img.src = `https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`;
  noscript.appendChild(img);
  document.body.appendChild(noscript);
}

export function fireMetaEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", eventName, params);
  }
}

// ─── Google Tag (gtag.js) ───

let gtagLoaded = false;

export function initGoogleTag(tagId: string) {
  if (gtagLoaded || !tagId) return;
  if (!GOOGLE_TAG_ID_RE.test(tagId)) {
    console.warn("[adTracking] Invalid Google tag ID format; refusing to load");
    return;
  }
  gtagLoaded = true;

  // Load gtag.js script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag — tagId validated above
  const initScript = document.createElement("script");
  initScript.text = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', ${JSON.stringify(tagId)});
  `;
  document.head.appendChild(initScript);
}

export function fireGoogleEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, params);
  }
}

// ─── Convenience: fire on both platforms ───

export function fireConversionEvent(
  eventName: string,
  metaEventName?: string,
  googleEventName?: string,
  params?: Record<string, unknown>
) {
  fireMetaEvent(metaEventName || eventName, params);
  fireGoogleEvent(googleEventName || eventName, params);
}

// ─── Reset (for disconnect) ───

export function resetMetaPixel() {
  metaPixelLoaded = false;
  delete (window as any).fbq;
}

export function resetGoogleTag() {
  gtagLoaded = false;
  delete (window as any).gtag;
}
