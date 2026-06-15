export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minutes} ${ampm}`;
}

// Converts an "HH:MM" or "HH:MM:SS" time string to minutes since midnight.
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':');
  return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
}

export const QUARTER_HOUR_MINUTES = 15;

// "HH:MM" values for every 15-minute slot from 00:00 to 23:45 (96 entries).
export const QUARTER_HOUR_TIMES: string[] = Array.from({ length: (24 * 60) / QUARTER_HOUR_MINUTES }, (_, i) => {
  const total = i * QUARTER_HOUR_MINUTES;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

// Snaps an "HH:MM" or "HH:MM:SS" time to the nearest 15-minute slot, returning
// "HH:MM". Empty input is returned unchanged; results never roll past 23:45.
export function roundToNearest15(time: string): string {
  if (!time) return time;

  const totalMinutes = timeToMinutes(time);
  if (Number.isNaN(totalMinutes)) return time;

  const rounded = Math.round(totalMinutes / QUARTER_HOUR_MINUTES) * QUARTER_HOUR_MINUTES;
  const clamped = Math.min(rounded, 23 * 60 + 45);
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// True if `nowMinutes` falls within [start, end], handling windows that cross midnight.
export function isWithinWindow(start: string, end: string, nowMinutes: number): boolean {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (endMinutes >= startMinutes) {
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }

  // Overnight window (e.g. 22:00 - 02:00).
  return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
}
