import { Capacitor } from '@capacitor/core';
import { Haptics as CapHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Haptic feedback wrapper.
 *
 * On iOS/Android (Capacitor native shell): real Taptic Engine / system
 * haptics via `@capacitor/haptics`.
 *
 * On the plain web build: falls back to `navigator.vibrate`. That works on
 * Android Chrome/Firefox; iOS Safari has no Vibration API and no documented
 * way to fire haptics from JS — so the web build is silent on iPhones, but
 * the wrapped iOS app is not.
 *
 * Calls are fire-and-forget — we don't await the native promise because
 * dropped frames at gate-pass time matter more than knowing the OS finished
 * its haptic pulse.
 */

const isNative = Capacitor.isNativePlatform();
const canVibrate =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const haptics = {
  /** Light tap when both dots clear a gate. */
  pass(): void {
    if (isNative) {
      CapHaptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } else if (canVibrate) {
      navigator.vibrate(8);
    }
  },

  /** Heavier triple-thump on a fatal hit. */
  hit(): void {
    if (isNative) {
      CapHaptics.notification({ type: NotificationType.Error }).catch(() => {});
    } else if (canVibrate) {
      navigator.vibrate([60, 30, 90]);
    }
  }
};
