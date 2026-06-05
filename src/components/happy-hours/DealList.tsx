import type { LucideIcon } from 'lucide-react';
import type { DealListValue } from '../../types';
import { normalizeDealItems } from '../../utils/deals';

interface DealListProps {
  deals: DealListValue;
  icon: LucideIcon;
  iconClassName: string;
}

export function DealList({ deals, icon: IconComponent, iconClassName }: DealListProps) {
  const items = normalizeDealItems(deals);

  if (items.length === 0) return null;

  return (
    <div className="mt-1 flex items-start gap-2 text-sm text-gray-700">
      <IconComponent className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconClassName}`} />
      <ul className="min-w-0 flex-1 space-y-1">
        {items.map((deal, index) => (
          <li key={`${deal.name}-${index}`} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1 break-words">{deal.name}</span>
            {deal.price && (
              <span className="flex-shrink-0 font-medium text-gray-900">{deal.price}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
