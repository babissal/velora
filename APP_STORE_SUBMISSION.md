# Publishing Velora to the App Store

Velora is a web game wrapped with [Capacitor](https://capacitorjs.com/), which
turns it into a native iOS app. This guide walks you through everything from
zero. No prior mobile-dev experience assumed.

> **The honest summary:** most of this work *cannot* be automated or done from
> this repo alone. Apple requires a **Mac with Xcode** and a **paid Apple
> Developer account** ($99/year). The repo is now prepped as far as it can be;
> the rest is steps you do on your Mac.

---

## What's already done for you

- `capacitor.config.json` — app ID (`com.velora.game`), name, and iOS settings.
- `index.html` — iOS meta tags (status bar, theme color, web-app mode).
- `resources/icon.png` (1024×1024) and `resources/splash.png` (2732×2732) —
  placeholder art. Replace these with real artwork whenever you have it, then
  re-run the asset generator (step 4).
- `.gitignore` — keeps the generated `ios/` and `node_modules/` folders out of git.

---

## What you need before starting

| Requirement | Notes |
|---|---|
| A Mac | Any Mac from the last ~5 years. iOS apps **can only be built on macOS.** No Mac? See "No Mac?" at the bottom. |
| Xcode | Free from the Mac App Store. Large download (~10 GB). |
| Node.js | Install from <https://nodejs.org> (LTS version). |
| Apple Developer Program membership | $99/year. Enroll at <https://developer.apple.com/programs/>. Approval can take 24–48h, so start this early. |
| An Apple ID | Used to sign in to everything Apple. |

---

## Step 1 — Get the code onto your Mac

```bash
git clone https://github.com/babissal/velora.git
cd velora
git checkout claude/app-store-submission-F9lEy
```

## Step 2 — Install dependencies

```bash
npm install
```

## Step 3 — Add the iOS project

```bash
npx cap add ios
```

This creates an `ios/` folder containing a real Xcode project. (It's
git-ignored on purpose — it's generated, and regenerating it is one command.)

## Step 4 — Generate app icons and splash screens

```bash
npm install --save-dev @capacitor/assets
npx capacitor-assets generate --ios
```

This reads `resources/icon.png` + `resources/splash.png` and produces every
size iOS needs. **When you have real artwork**, drop a 1024×1024 PNG in as
`resources/icon.png`, a 2732×2732 PNG as `resources/splash.png`, and re-run
this command. (You can also tweak the placeholder via
`python3 resources/generate-icon.py`.)

## Step 5 — Sync the web code into the iOS project

```bash
npx cap sync ios
```

Run this **every time** you change the game's HTML/CSS/JS.

## Step 6 — Open the project in Xcode

```bash
npx cap open ios
```

## Step 7 — Configure signing in Xcode

1. In the left sidebar, click the blue **App** project at the top.
2. Select the **App** target → **Signing & Capabilities** tab.
3. Check **Automatically manage signing**.
4. Under **Team**, pick your Apple Developer account (sign in if prompted).
5. The **Bundle Identifier** should be `com.velora.game`. If Apple says it's
   taken, change it (e.g. `com.yourname.velora`) here *and* in
   `capacitor.config.json`, then re-run `npx cap sync ios`.

## Step 8 — Test on a real iPhone (recommended)

1. Plug your iPhone into the Mac.
2. In Xcode's top toolbar, select your iPhone as the run target.
3. Press the ▶ (Run) button. Approve the developer certificate on the phone if
   asked (Settings → General → VPN & Device Management).

This is the same as "deploying directly to your phone" — see the note at the
bottom about doing that *without* the App Store.

## Step 9 — Create the app listing in App Store Connect

1. Go to <https://appstoreconnect.apple.com> → **My Apps** → **+** → **New App**.
2. Fill in:
   - **Platform:** iOS
   - **Name:** Velora (must be unique across the App Store — have a backup name ready)
   - **Primary language**, **Bundle ID** (`com.velora.game`), **SKU** (any internal string, e.g. `velora-001`).
3. On the app page, fill in the required metadata:
   - **Description**, **keywords**, **support URL**, **category** (Games → Role Playing or Adventure).
   - **Screenshots** — required. Run the app in the iOS Simulator, press
     `Cmd+S` to save screenshots. You need at least one 6.7" iPhone screenshot.
   - **App icon** is pulled from the build automatically.
   - **Age rating** questionnaire.
   - **Privacy** — Velora stores data only on-device (via `@capacitor/preferences`)
     and has no accounts, ads, or tracking, so the privacy section is short.
     You still must provide a privacy policy URL.

## Step 10 — Build and upload

1. In Xcode, set the run target to **Any iOS Device (arm64)** (top toolbar).
2. Menu: **Product → Archive**. Wait for it to build.
3. When the Organizer window opens, click **Distribute App** →
   **App Store Connect** → follow the prompts.
4. After upload, the build appears in App Store Connect under your app's
   **TestFlight** tab within ~15–30 min (Apple processes it).

## Step 11 — Submit for review

1. In App Store Connect, open your app → the version you're releasing.
2. Under **Build**, select the build you just uploaded.
3. Click **Add for Review** → **Submit**.
4. Apple review typically takes 1–3 days. They may reject and ask for changes —
   that's normal; fix and resubmit.

## Updating the app later

1. Bump the version in Xcode (target → **General** → **Version** / **Build**).
2. Make your game changes, then `npx cap sync ios`.
3. Repeat steps 10–11.

---

## No Mac? Your options

- **Cloud Mac rental** — services like MacStadium, MacinCloud, or AWS EC2 Mac
  instances give you a remote macOS desktop you can run Xcode on.
- **CI build services** — [Codemagic](https://codemagic.io/),
  [Bitrise](https://bitrise.io/), or GitHub Actions (macOS runners) can build
  and upload to App Store Connect for you. More setup, no Mac needed day-to-day.
- **Borrow a Mac** — you only strictly need it for steps 6–10.

Either way you still need the **paid Apple Developer account** — there is no way
around that for public App Store distribution.

## Can I just put it on my own iPhone without the App Store?

Yes — see the short version: with a **free** Apple ID you can run the app on
your own iPhone straight from Xcode (step 8), but the app **expires after 7
days** and must be re-installed. With the **paid** developer account it lasts a
year, and you can also use **TestFlight** to share it with up to 10,000 testers
without a public App Store release. App Store is only required if you want it
publicly downloadable by anyone.

---

# Publishing Velora to the Google Play Store

Good news: Android is **easier and cheaper** than iOS.

| iOS (App Store) | Android (Google Play) |
|---|---|
| Needs a Mac | Builds on **any OS** — Windows, Mac, or Linux |
| $99/year | **$25 one-time** developer fee |
| Review: 1–3 days | Review: a few hours to a few days |

## What you need

- **Node.js** — <https://nodejs.org>
- **Android Studio** — <https://developer.android.com/studio> (free; includes the
  Android SDK and a JDK).
- **A Google Play Developer account** — register at
  <https://play.google.com/console>, one-time $25 fee.

## Step 1 — Get the code and install dependencies

```bash
git clone https://github.com/babissal/velora.git
cd velora
git checkout claude/app-store-submission-F9lEy
npm install
```

## Step 2 — Add the Android project

```bash
npx cap add android
```

This creates an `android/` folder (git-ignored — it's regenerated by this one
command).

## Step 3 — Generate icons and splash screens

```bash
npm install --save-dev @capacitor/assets
npx capacitor-assets generate --android
```

Same `resources/icon.png` + `resources/splash.png` sources as iOS. Replace them
with real artwork and re-run when you have it.

## Step 4 — Sync the web code in

```bash
npx cap sync android
```

Run this every time you change the game's HTML/CSS/JS.

## Step 5 — Open in Android Studio

```bash
npx cap open android
```

Let it finish "Gradle sync" the first time (can take several minutes).

## Step 6 — Test on a device or emulator

- **Real phone:** enable Developer Options + USB debugging on the phone, plug it
  in, pick it in the toolbar, press ▶ Run.
- **Emulator:** Android Studio → Device Manager → create a virtual device, then
  press ▶ Run.

## Step 7 — Set the version

Open `android/app/build.gradle` and set `versionCode` (an integer, increment it
every upload) and `versionName` (e.g. `"1.0.0"`, shown to users).

## Step 8 — Create a signing key

Google Play requires every release to be signed. Create a keystore **once** and
**back it up safely** — if you lose it you can't update the app.

```bash
keytool -genkey -v -keystore velora-release.keystore \
  -alias velora -keyalg RSA -keysize 2048 -validity 10000
```

(`keytool` ships with the JDK that comes with Android Studio.) In Android Studio
you'll point at this file when building, or wire it into
`android/app/build.gradle` — Android Studio's **Build → Generate Signed
Bundle/APK** wizard walks you through it.

## Step 9 — Build a release bundle

In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle
(.aab)**. Choose your keystore from step 8, pick the **release** build variant,
and finish. You get an `.aab` file — that's what Google Play wants.

## Step 10 — Create the app in the Play Console

1. <https://play.google.com/console> → **Create app**.
2. Fill in name (**Velora**), language, "App", "Free", and accept the
   declarations.
3. Work through the **Dashboard** checklist Google shows you:
   - **Store listing** — short & full description, app icon (auto from the
     bundle), **screenshots** (at least 2 phone screenshots; take them from the
     emulator or a real device), and a **feature graphic** (1024×500 banner).
   - **Content rating** questionnaire.
   - **Target audience**, **Data safety** form — Velora stores data only
     on-device and has no ads/accounts/tracking, so this is short. You still
     need a **privacy policy URL**.
   - **App category:** Games → Role Playing or Adventure.

## Step 11 — Upload and release

1. In the Play Console, go to **Release → Production → Create new release** (or
   start with **Internal testing** to try it privately first — recommended).
2. Upload your `.aab` from step 9.
3. Add release notes, **Save → Review release → Start rollout**.
4. Google reviews it; the first submission usually takes the longest.

## Updating later

Bump `versionCode`/`versionName` (step 7), run `npx cap sync android`, rebuild
the signed bundle with the **same keystore**, and upload a new release.

## Can I install it on my own Android phone without the Play Store?

Yes, trivially — Android allows "sideloading". Build an APK (Android Studio:
**Build → Build Bundle(s)/APK(s) → Build APK(s)**), copy the `.apk` to your
phone, and open it (you'll approve "install from unknown sources" once). No
developer account, no fee, no expiry. The $25 account and the steps above are
only needed for public Play Store distribution.
