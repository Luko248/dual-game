# iOS Release — DUAL

The native app is an Expo shell (`mobile/`) around the web game: the whole
game is built into **one self-contained HTML file** and loaded from the app
package in a WKWebView, so it runs fully offline. The release pipeline is
the same Xcode-native flow used for ActiveGotchi — `expo prebuild` →
`pod install` → `xcodebuild archive` → `xcodebuild -exportArchive` upload —
no EAS account needed.

## One-time prerequisites (on your Mac)

- Xcode + command-line tools, CocoaPods, bun.
- Apple Developer Program membership (team `D37259WW5B`, already set in
  `mobile/app.config.ts` → `ios.appleTeamId`).
- An **App Store Connect API key** (`.p8`) for headless uploads — the same
  key you already use for ActiveGotchi works; keep it under
  `~/.appstoreconnect/private_keys/`. Never commit it.
- In App Store Connect: create the app record — platform iOS,
  bundle ID `com.dualgame.app` (change it in `mobile/app.config.ts` first if
  you prefer a different one; do it *before* the first upload).

## Build & upload (every release)

All commands from the repo root unless noted.

```bash
# 0. Fresh game bundle — never ship a stale one.
bun install
bun run build:mobile          # → mobile/assets/game/index.html (gitignored)

# Optional: bake in the global leaderboard for the app build
# VITE_PLAYFAB_TITLE_ID=XXXX bun run build:mobile

# 1. Shell deps (first time / after dependency changes)
cd mobile
bun install
bunx expo install --fix       # aligns native-module versions with the Expo SDK

# 2. Bump the build number — ios.buildNumber (string) AND
#    android.versionCode (number) to the SAME value, one commit.
#    (Edit mobile/app.config.ts.)

# 3. Generate the iOS project (clean every time; ios/ is gitignored)
bunx expo prebuild --platform ios --clean --no-install
cd ios && pod install && cd ..    # never skip pod install

# 4. Archive (headless, automatic signing; ~a few minutes)
caffeinate -dims xcodebuild archive \
  -workspace ios/DUAL.xcworkspace \
  -scheme DUAL \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/DUAL.xcarchive \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=D37259WW5B \
  CODE_SIGN_STYLE=Automatic \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8 \
  -authenticationKeyID <KEY_ID> \
  -authenticationKeyIssuerID <ISSUER_ID>

# 5. Verify the archive before uploading
/usr/libexec/PlistBuddy -c 'Print :ApplicationProperties:CFBundleVersion' \
  build/DUAL.xcarchive/Info.plist          # must equal the bump from step 2

# 6. Export + upload to App Store Connect
cat > build/exportOptions.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>D37259WW5B</string>
</dict></plist>
EOF

xcodebuild -exportArchive \
  -archivePath build/DUAL.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist build/exportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8 \
  -authenticationKeyID <KEY_ID> \
  -authenticationKeyIssuerID <ISSUER_ID>
```

"Upload succeeded" is **not** a shipped build — wait until the build shows
`processingState: VALID` in App Store Connect (TestFlight tab), then add
"What to Test" notes and distribute to testers / submit for review.

## Dev loop

```bash
bun run build:mobile      # repo root — refresh the game bundle
cd mobile && bunx expo run:ios    # dev build on simulator/device
```

Expo Go won't work once native config matters — use a development build
(`expo run:ios`). `webviewDebuggingEnabled` is on in dev, so you can attach
Safari Web Inspector to the game.

## App Store review notes

- **Guideline 4.2 (minimum functionality)**: the game is fully playable
  offline inside the app with no browser chrome — this is an app-packaged
  game, not a website link. Mention it in Review Notes if asked.
- **Privacy / data collection**: without `VITE_PLAYFAB_TITLE_ID` the app
  makes zero network calls — answer "Data Not Collected". With PlayFab
  enabled, declare Identifiers (device ID) + Gameplay Content (scores,
  player name), not linked to identity, not used for tracking.
- **Age rating**: no objectionable content → 4+.
- Screenshots: 6.9" (iPhone 16 Pro Max) and 6.5" sizes are the required
  sets; capture the improved menu, gameplay, and the leaderboard.

## Versioning law

`ios.buildNumber` (string) and `android.versionCode` (number) in
`mobile/app.config.ts` are always bumped **together to the same value, in
one commit**, even though Android isn't shipping yet — identical to the
ActiveGotchi convention.
