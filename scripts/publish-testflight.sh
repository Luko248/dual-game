#!/usr/bin/env bash
#
# Publish DUAL to TestFlight — headless, App Store Connect API key auth.
#
# Same shape as ActiveGotchi's proven pipeline (bump -> build -> archive ->
# verify -> upload, authenticated by an ASC API key instead of an Apple-ID
# session, which silently dies mid-release). Differences from that project:
#   - Capacitor, not Expo: no `expo prebuild`, no CocoaPods/Podfile — deps
#     resolve via Swift Package Manager when xcodebuild touches the project,
#     so the FIRST run needs network access and may take longer.
#   - Single target, no embedded watch app.
#
# Required env vars (no secrets are hardcoded in this file):
#   ASC_KEY_PATH     Path to the App Store Connect API private key (.p8)
#   ASC_KEY_ID       That key's Key ID
#   ASC_ISSUER_ID    That key's Issuer ID
#
# Optional:
#   DEVELOPMENT_TEAM Apple Developer Team ID (default: D37259WW5B, same team
#                     as ActiveGotchi — override if DUAL lives elsewhere)
#   BUILD_NUMBER     Explicit CFBundleVersion. Default: auto-increments the
#                     current CURRENT_PROJECT_VERSION in the Xcode project.
#
# One-time prerequisites (see docs/RELEASE.md):
#   1. The app record for com.lukaschylik.dualmind must already exist in App
#      Store Connect (My Apps -> +) — the upload step fails without it.
#   2. This machine needs network access on first run for SPM to fetch the
#      Capacitor xcframework packages.
#
# Usage:
#   ASC_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_XXXX.p8 \
#   ASC_KEY_ID=XXXXXXXXXX \
#   ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
#   ./scripts/publish-testflight.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-D37259WW5B}"
WORKSPACE_PROJECT="ios/App/App.xcodeproj"
SCHEME="App"
PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------
: "${ASC_KEY_PATH:?Set ASC_KEY_PATH to the .p8 App Store Connect API key path}"
: "${ASC_KEY_ID:?Set ASC_KEY_ID to that key's Key ID}"
: "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID to that key's Issuer ID}"

if [[ ! -f "$ASC_KEY_PATH" ]]; then
  echo "error: ASC_KEY_PATH ($ASC_KEY_PATH) does not exist" >&2
  exit 1
fi

echo "==> Preflight OK. Team: $DEVELOPMENT_TEAM"

# ---------------------------------------------------------------------------
# 1. Green-gate: the web build must succeed (no lint/test configured — see
#    AGENTS.md). This is also step 2 below (cap sync needs dist/ anyway).
# ---------------------------------------------------------------------------
echo "==> Building web bundle"
bun run build

# ---------------------------------------------------------------------------
# 2. Bump the build number (CFBundleVersion). App Store Connect rejects
#    reused build numbers.
# ---------------------------------------------------------------------------
CURRENT_BUILD="$(grep -m1 'CURRENT_PROJECT_VERSION' "$PBXPROJ" | grep -oE '[0-9]+')"
NEW_BUILD="${BUILD_NUMBER:-$((CURRENT_BUILD + 1))}"
echo "==> Bumping build number: $CURRENT_BUILD -> $NEW_BUILD"
sed -i '' "s/CURRENT_PROJECT_VERSION = $CURRENT_BUILD;/CURRENT_PROJECT_VERSION = $NEW_BUILD;/g" "$PBXPROJ"

# ---------------------------------------------------------------------------
# 3. Sync the web build into the native iOS shell.
# ---------------------------------------------------------------------------
echo "==> cap sync ios"
bunx cap sync ios

# ---------------------------------------------------------------------------
# 4. Archive (headless-safe; keep the Mac awake — screen lock has killed
#    uploads before). SPM package resolution happens as part of this step.
# ---------------------------------------------------------------------------
SCRATCH_DIR="$(mktemp -d /tmp/dual-testflight.XXXXXX)"
ARCHIVE_PATH="$SCRATCH_DIR/DUAL-b$NEW_BUILD.xcarchive"

echo "==> Archiving (scratch: $SCRATCH_DIR)"
caffeinate -dims xcodebuild archive \
  -project "$WORKSPACE_PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
  CODE_SIGN_STYLE=Automatic \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"

# ---------------------------------------------------------------------------
# 5. Verify the archive before shipping it anywhere.
# ---------------------------------------------------------------------------
echo "==> Verifying archive"
APP_PATH="$ARCHIVE_PATH/Products/Applications/App.app"

if [[ ! -d "$APP_PATH" ]]; then
  echo "error: $APP_PATH not found in archive" >&2
  exit 1
fi

FRAMEWORK_COUNT="$(ls "$APP_PATH/Frameworks" 2>/dev/null | wc -l | tr -d ' ')"
echo "    Frameworks embedded: $FRAMEWORK_COUNT"
if [[ "$FRAMEWORK_COUNT" -lt 1 ]]; then
  echo "error: no embedded frameworks — broken archive, not uploading" >&2
  exit 1
fi

ARCHIVED_BUILD="$(/usr/libexec/PlistBuddy -c "Print :ApplicationProperties:CFBundleVersion" "$ARCHIVE_PATH/Info.plist")"
if [[ "$ARCHIVED_BUILD" != "$NEW_BUILD" ]]; then
  echo "error: archive build number ($ARCHIVED_BUILD) != expected ($NEW_BUILD)" >&2
  exit 1
fi
echo "    Bundle version confirmed: $ARCHIVED_BUILD"

# ---------------------------------------------------------------------------
# 6. Export + upload via the ASC API key — never the Apple-ID session.
# ---------------------------------------------------------------------------
EXPORT_PLIST="$SCRATCH_DIR/exportOptions.plist"
sed "s/__TEAM_ID__/$DEVELOPMENT_TEAM/" ios/exportOptions.template.plist > "$EXPORT_PLIST"

EXPORT_PATH="$SCRATCH_DIR/export"
echo "==> Exporting + uploading to App Store Connect"
caffeinate -dims xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -exportPath "$EXPORT_PATH" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"

echo "==> Done. Build $NEW_BUILD uploaded — check App Store Connect > TestFlight."
echo "    (Committing the build-number bump in $PBXPROJ is up to you.)"
