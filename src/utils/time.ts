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
