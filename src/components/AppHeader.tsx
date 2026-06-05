import { Plus } from 'lucide-react';

interface AppHeaderProps {
  onAddRestaurant: () => void;
}

export function AppHeader({ onAddRestaurant }: AppHeaderProps) {
  return (
    <header className="z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:px-6 md:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-gray-900 md:text-2xl">Happy Hours</h1>
          <p className="truncate text-xs text-gray-500 md:text-sm">
            Track the best happy hour deals
          </p>
        </div>
        <button
          type="button"
          onClick={onAddRestaurant}
          className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md md:px-6 md:py-3"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Add Restaurant</span>
        </button>
      </div>
    </header>
  );
}
