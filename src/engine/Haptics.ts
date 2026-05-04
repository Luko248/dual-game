/**
 * Tiny haptics wrapper around navigator.vibrate.
 * Two distinct patterns so the player can feel the difference between
 * a clean gate pass and a fatal collision. Fails silently on unsupported
 * platforms (iOS Safari, desktop).
 */

const canVibrate = (): boolean =>
  typeof navigator !== 'undefined' &&
  typeof navigator.vibrate === 'function';

export const haptics = {
  /** Light tap when both dots clear a gate. */
  pass(): void {
    if (canVibrate()) navigator.vibrate(8);
  },

  /** Heavier double-thump on a fatal hit. */
  hit(): void {
    if (canVibrate()) navigator.vibrate([60, 30, 90]);
  }
};
