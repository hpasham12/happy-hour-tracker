import { formatTime, QUARTER_HOUR_TIMES, roundToNearest15 } from '../../utils/time';

interface TimeSelectProps {
  value: string; // "HH:MM" or "HH:MM:SS" (empty allowed when emptyLabel is set)
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  ariaLabel?: string;
  // When provided, renders a leading blank option (e.g. "Any") for optional fields.
  emptyLabel?: string;
}

// Dropdown that constrains time entry to 15-minute increments. Stores "HH:MM"
// values and displays 12-hour labels. Off-grid incoming values are shown as a
// snapped fallback option so the field never renders blank unexpectedly.
export function TimeSelect({
  value,
  onChange,
  className = '',
  id,
  ariaLabel,
  emptyLabel,
}: TimeSelectProps) {
  const normalized = value ? value.slice(0, 5) : '';
  const isOnGrid = normalized === '' || QUARTER_HOUR_TIMES.includes(normalized);
  const fallback = !isOnGrid ? roundToNearest15(normalized) : null;

  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={isOnGrid ? normalized : fallback ?? ''}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {QUARTER_HOUR_TIMES.map((time) => (
        <option key={time} value={time}>
          {formatTime(time)}
        </option>
      ))}
    </select>
  );
}
