/**
 * Tracks real user input in this browser tab.
 *
 * "Activity" means a pointer/keyboard/touch/scroll event, or the tab becoming
 * visible again. Hidden tabs and idle tabs are deliberately treated as
 * inactive so a background tab cannot keep a session alive forever.
 */

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll', 'mousemove'];

// mousemove fires dozens of times per second; one sample per second is enough.
const MOVE_THROTTLE_MS = 1000;

export function createActivityTracker() {
  let lastActivityAt = Date.now();
  let lastMoveAt = 0;
  let started = false;

  const markActive = () => {
    lastActivityAt = Date.now();
  };

  const handleEvent = (event) => {
    if (event.type === 'mousemove') {
      const now = Date.now();
      if (now - lastMoveAt < MOVE_THROTTLE_MS) return;
      lastMoveAt = now;
    }
    markActive();
  };

  const start = () => {
    if (started || typeof window === 'undefined') return;
    started = true;
    ACTIVITY_EVENTS.forEach((name) =>
      window.addEventListener(name, handleEvent, { passive: true, capture: true })
    );
    window.addEventListener('focus', markActive);
    document.addEventListener('visibilitychange', handleVisibility);
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') markActive();
  };

  const stop = () => {
    if (!started) return;
    started = false;
    ACTIVITY_EVENTS.forEach((name) =>
      window.removeEventListener(name, handleEvent, { passive: true, capture: true })
    );
    window.removeEventListener('focus', markActive);
    document.removeEventListener('visibilitychange', handleVisibility);
  };

  const isActive = (idleMs) => {
    if (typeof document === 'undefined') return false;
    if (document.visibilityState !== 'visible') return false;
    return Date.now() - lastActivityAt <= idleMs;
  };

  const getIdleFor = () => Date.now() - lastActivityAt;

  return { start, stop, markActive, isActive, getIdleFor, getLastActivityAt: () => lastActivityAt };
}
