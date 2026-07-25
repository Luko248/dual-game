import type { ExpoConfig } from 'expo/config';

/**
 * DUAL — native shell config.
 *
 * The app is an Expo WebView shell around the single-file game bundle
 * produced by `bun run build:mobile` at the repo root (written to
 * mobile/assets/game/index.html, gitignored — rebuild before every
 * prebuild/archive so the shipped game is never stale).
 *
 * Release law (same as ActiveGotchi): ios.buildNumber (string) and
 * android.versionCode (number) are ALWAYS bumped together to the same
 * value, in one commit.
 */
const config: ExpoConfig = {
  name: 'DUAL',
  slug: 'dual',
  version: '1.0.0',
  scheme: 'dual',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#05050a',
  ios: {
    bundleIdentifier: 'com.dualgame.app',
    appleTeamId: 'D37259WW5B',
    buildNumber: '1',
    supportsTablet: false,
    requireFullScreen: true,
    infoPlist: {
      /* Game only makes optional HTTPS calls (PlayFab) — no exempt crypto. */
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    package: 'com.dualgame.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: '#05050a'
    }
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#05050a'
      }
    ]
  ]
};

export default config;
