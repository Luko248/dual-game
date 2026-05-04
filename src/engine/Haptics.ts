import { WebHaptics } from 'web-haptics';

/**
 * Haptic feedback wrapper.
 *
 * Uses the `web-haptics` package, which:
 *   - calls `navigator.vibrate` on Android / vibration-capable browsers
 *   - falls back to a hidden `<input type="checkbox" switch>` element on
 *     iOS Safari 17.4+ (clicking that element triggers the Taptic Engine,
 *     the only documented way to get real haptics from a web page on iOS)
 *
 * We share a single instance — instantiating creates DOM, so we don't want
 * to spin up new ones on every play.
 */

const engine = new WebHaptics({ debug: false, showSwitch: false });

export const haptics = {
  /** Light tap when both dots clear a gate. */
  pass(): void {
    engine.trigger('selection');
  },

  /** Heavier double-thump on a fatal hit. */
  hit(): void {
    engine.trigger('error');
  }
};
