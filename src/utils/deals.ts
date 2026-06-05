import type { DealItem, DealListValue } from '../types';

export const emptyDeal = (): DealItem => ({ name: '', price: '' });

export function cleanDeals(deals: DealItem[]) {
  return deals
    .map((deal) => ({
      name: deal.name.trim(),
      price: deal.price?.trim() ?? '',
    }))
    .filter((deal) => deal.name);
}

export function normalizeDealItems(deals: DealListValue): DealItem[] {
  if (!deals) return [];

  if (typeof deals === 'string') {
    const trimmed = deals.trim();
    return trimmed ? [{ name: trimmed }] : [];
  }

  return deals.filter((deal) => deal.name.trim());
}

export function normalizeDealsForForm(deals: DealListValue): DealItem[] {
  if (!deals) return [emptyDeal()];

  if (typeof deals === 'string') {
    const trimmed = deals.trim();
    return trimmed ? [{ name: trimmed, price: '' }] : [emptyDeal()];
  }

  const normalizedDeals = deals.map((deal) => ({
    name: deal.name,
    price: deal.price ?? '',
  }));

  return normalizedDeals.length > 0 ? normalizedDeals : [emptyDeal()];
}
