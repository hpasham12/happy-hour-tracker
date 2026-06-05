import { List, MapPin } from 'lucide-react';
import type { RestaurantWithHappyHours } from '../../types';
import { formatAddress } from '../../utils/address';

interface RestaurantSidebarProps {
  restaurants: RestaurantWithHappyHours[];
  selectedRestaurant: RestaurantWithHappyHours | null;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onSelectRestaurant: (restaurant: RestaurantWithHappyHours) => void;
}

function displayAddress(address: string) {
  return formatAddress({ display_name: address });
}

export function RestaurantSidebar({
  restaurants,
  selectedRestaurant,
  isOpen,
  onClose,
  onOpen,
  onSelectRestaurant,
}: RestaurantSidebarProps) {
  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 z-20 bg-black/40 md:hidden" />}

      <div
        className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[75vh] flex-col overflow-hidden rounded-t-2xl border-gray-200 bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } md:static md:z-10 md:h-full md:max-h-none md:min-h-0 md:rounded-none md:border-r md:shadow-none md:transition-[width] md:translate-y-0 ${
          isOpen ? 'md:w-96' : 'md:w-0'
        }`}
      >
        <div className="flex justify-center pb-1 pt-2 md:hidden">
          <div className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800">
            {restaurants.length} Restaurant{restaurants.length !== 1 ? 's' : ''}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 p-2 text-lg leading-none text-gray-500 hover:text-gray-700 md:text-base"
          >
            x
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {restaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              type="button"
              onClick={() => onSelectRestaurant(restaurant)}
              className={`w-full border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 ${
                selectedRestaurant?.id === restaurant.id ? 'border-l-4 border-l-blue-600 bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                    {restaurant.is_inkind && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                        inKind
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{displayAddress(restaurant.address)}</p>
                </div>
              </div>
            </button>
          ))}
          {restaurants.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <MapPin className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p>No restaurants yet.</p>
              <p className="mt-1 text-sm">Click on the map or the Add button to add one!</p>
            </div>
          )}
        </div>
      </div>

      {!isOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium shadow-lg transition-colors hover:bg-gray-50 md:bottom-auto md:left-4 md:top-4 md:translate-x-0 md:rounded-lg md:px-4 md:py-2 md:shadow-md"
        >
          <List className="h-4 w-4 md:hidden" />
          <span className="md:hidden">Restaurants</span>
          <span className="hidden md:inline">Show List</span>
        </button>
      )}
    </>
  );
}
