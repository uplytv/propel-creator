# UPLY iOS — Native Build Guide

UPLY ships as both a web app and a native iOS app from the same codebase via [Capacitor](https://capacitorjs.com). Every feature with a native equivalent (haptics, camera, push, file uploads) auto-detects the platform via `isNative()` in `src/lib/native/platform.ts` and uses the right API.

---

## 1. First-time local setup (Mac + Xcode required)

```bash
# 1. Pull the repo from your GitHub export
git clone <your-uply-repo>.git
cd uply

# 2. Install JS deps
npm install

# 3. Add the iOS native project (only the first time on each machine)
npx cap add ios

# 4. Build web + sync to iOS + open Xcode
npm run ios
```

After `cap add ios`, an `ios/` folder appears at the repo root. **Do not edit `ios/App/App/public/`** — it's overwritten on every `cap sync`.

> The Lovable sandbox cannot run `cap add ios` because it has no Xcode/CocoaPods. You must run it on your Mac.

---

## 2. Required Info.plist permissions

After `cap add ios`, open `ios/App/App/Info.plist` and add these keys (Capacitor 8 ships some of these as templates, but verify):

```xml
<key>NSCameraUsageDescription</key>
<string>UPLY uses your camera to record videos and go live.</string>

<key>NSMicrophoneUsageDescription</key>
<string>UPLY uses your microphone to record audio for videos and live streams.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>UPLY accesses your photo library so you can upload photos and videos.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>UPLY saves photos and videos you create back to your photo library.</string>
```

For push notifications, in Xcode:
1. Select the `App` target → **Signing & Capabilities** → **+ Capability**
2. Add **Push Notifications**
3. Add **Background Modes** and tick **Remote notifications**

---

## 3. Daily dev loop

```bash
# After any web code change
npm run ios:sync     # builds + syncs, doesn't reopen Xcode
# or
npm run ios          # builds + syncs + opens Xcode
```

In Xcode: pick a simulator (iPhone 15 Pro recommended) → ⌘R to run.

The `capacitor.config.ts` has a `server.url` pointing at the Lovable sandbox so you get hot-reload while developing. **Comment that block out** before producing a TestFlight build — otherwise the app loads from the sandbox URL instead of bundled assets.

---

## 4. Brand assets

- **Bundle ID**: `com.uply.app`
- **App name**: `UPLY`
- **Splash background**: `#0A0A0A` (matches `--background` token)
- **Status bar**: dark content on `#0A0A0A`
- **Brand accent**: `#00FF85`

Replace the default Capacitor icon/splash:
- Drop a 1024×1024 PNG at `resources/icon.png`
- Drop a 2732×2732 PNG (centered logo on `#0A0A0A`) at `resources/splash.png`
- Run: `npx @capacitor/assets generate --ios`

---

## 5. TestFlight build (when ready)

> Out of scope for the initial scaffold prompt — App Store Connect setup and signing certs handled separately. High-level flow:

1. Comment out the `server.url` in `capacitor.config.ts`.
2. `npm run ios:sync`
3. In Xcode: **Product → Archive**.
4. Window → Organizer → **Distribute App** → **App Store Connect** → **Upload**.
5. In App Store Connect → TestFlight tab, add internal testers.

---

## 6. Native feature map

| Feature           | Native (iOS)                                   | Web fallback                              |
| ----------------- | ---------------------------------------------- | ----------------------------------------- |
| Haptics           | `@capacitor/haptics` `Haptics.impact()`        | `navigator.vibrate(10)` (silent on iOS)   |
| Camera roll       | `@capacitor/camera` `Camera.pickImages()`      | `<input type="file" capture>`             |
| Live camera       | WebRTC `getUserMedia` (works on both)          | same                                      |
| Mux video upload  | CapacitorHttp PUT (no CORS, background-safe)   | UpChunk / XHR PUT with progress           |
| Push notifications| APNs via `@capacitor/push-notifications`       | Web Push via service worker (`public/sw.js`) |
| Filesystem        | `@capacitor/filesystem`                        | n/a (not needed on web)                   |
| Status bar        | `@capacitor/status-bar` (dark on `#0A0A0A`)    | `<meta name="theme-color">`               |
| Splash screen     | `@capacitor/splash-screen` (manual hide)       | n/a                                       |
| Safe area         | `env(safe-area-inset-*)` + `viewport-fit=cover` | same                                     |

All branching lives behind `isNative()` from `src/lib/native/platform.ts`.

---

## 7. Push token storage

On native sign-in, `registerNativePush(userId)` (in `src/lib/native/pushNotifications.ts`) calls `PushNotifications.register()` and persists the APNs token to the `push_tokens` table:

```
push_tokens (user_id, token, platform, device_info)
```

Server-side code that wants to push to a user reads this table and dispatches via APNs (iOS) or Web Push (web).
