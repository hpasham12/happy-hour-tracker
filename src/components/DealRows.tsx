import { Plus, Trash2 } from 'lucide-react';
import type { DealItem } from '../types';

interface DealRowsProps {
  title: string;
  deals: DealItem[];
  onAdd: () => void;
  onRemove: (dealIndex: number) => void;
  onChange: (dealIndex: number, field: keyof DealItem, value: string) => void;
  itemPlaceholder: string;
}

export function DealRows({
  title,
  deals,
  onAdd,
  onRemove,
  onChange,
  itemPlaceholder,
}: DealRowsProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-gray-700">{title}</label>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      <div className="space-y-2">
        {deals.map((deal, dealIndex) => (
          <div key={dealIndex} className="grid grid-cols-[minmax(0,1fr)_7rem_2rem] gap-2">
            <input
              type="text"
              value={deal.name}
              onChange={(e) => onChange(dealIndex, 'name', e.target.value)}
              placeholder={itemPlaceholder}
              className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={deal.price ?? ''}
              onChange={(e) => onChange(dealIndex, 'price', e.target.value)}
              placeholder="$"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => onRemove(dealIndex)}
              className="flex h-10 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-gray-200"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
