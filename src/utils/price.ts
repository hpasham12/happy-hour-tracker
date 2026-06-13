import { normalizeDealItems } from './deals';
import type { DealListValue } from '../types';

// Extracts the first dollar amount from a free-text price string (e.g. "$5",
// "2 for $10", "$8.50 each") and returns it as a number, or null if none found.
export function parsePrice(text?: string | null): number | null {
  if (!text) return null;
  const match = text.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  return match ? parseFloat(match[1]) : null;
}

// Lowest parseable price across a deal list, or null when no priced deal exists.
export function lowestDealPrice(deals: DealListValue): number | null {
  const prices = normalizeDealItems(deals)
    .map((deal) => parsePrice(deal.price))
    .filter((price): price is number => price !== null);

  return prices.length > 0 ? Math.min(...prices) : null;
}
