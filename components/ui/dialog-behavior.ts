export const DIALOG_EXIT_MS = 180;

/** Return a wrapped focus destination, or null when native Tab should proceed. */
export function dialogFocusTargetIndex(length: number, activeIndex: number, backwards: boolean): number | null {
  if (length < 1) return null;
  if (activeIndex < 0) return backwards ? length - 1 : 0;
  if (backwards && activeIndex === 0) return length - 1;
  if (!backwards && activeIndex === length - 1) return 0;
  return null;
}

export function dialogExitDuration(reducedMotion: boolean) {
  return reducedMotion ? 0 : DIALOG_EXIT_MS;
}
