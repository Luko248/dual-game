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
 *
 * Mute is persisted and player-controlled from Settings → AUDIO → HAPTICS,
 * mirroring `SoundEngine`'s mute. A haptic is felt in the hand and the silent
 * switch cannot mute it, so it needs its own opt-out independent of sound.
 */

const MUTE_KEY = 'dual_haptics_muted';

const isNative = Capacitor.isNativePlatform();
const canVibrate =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* ignore */ }

export const haptics = {
  isMuted(): boolean { return muted; },

  setMuted(next: boolean): void {
    muted = next;
    try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
  },

  /** Toggle and return the new muted state. */
  toggleMute(): boolean {
    this.setMuted(!muted);
    return muted;
  },

  /** Light tap when both dots clear a gate. */
  pass(): void {
    if (muted) return;
    if (isNative) {
      CapHaptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } else if (canVibrate) {
      navigator.vibrate(8);
    }
  },

  /** Heavier triple-thump on a fatal hit. */
  hit(): void {
    if (muted) return;
    if (isNative) {
      CapHaptics.notification({ type: NotificationType.Error }).catch(() => {});
    } else if (canVibrate) {
      navigator.vibrate([60, 30, 90]);
    }
  }
};
