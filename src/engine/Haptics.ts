/**
 * Haptic feedback wrapper around navigator.vibrate.
 *
 * Works on Android Chrome / Firefox and most Chromium-based browsers.
 *
 * iOS Safari is silent — it does NOT implement the Vibration API, and the
 * `<input type="checkbox" switch>` Taptic trick (used by libraries like
 * web-haptics) only fires on a *real* user-touch toggle of the switch, not
 * on programmatic `.click()` calls. There is no documented way to fire
 * haptics from JS on iOS for in-game events. We accept that and no-op.
 */

const supported =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const haptics = {
  /** Light tap when both dots clear a gate. */
  pass(): void {
    if (supported) navigator.vibrate(8);
  },

  /** Heavier double-thump on a fatal hit. */
  hit(): void {
    if (supported) navigator.vibrate([60, 30, 90]);
  }
};
