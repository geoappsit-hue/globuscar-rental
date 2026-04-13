'use client';

import { useState, useMemo } from 'react';
import { Car } from '@/types';

interface Props {
  cars: Car[];
  loading: boolean;
  selectedCar: Car | null;
  onSelect: (car: Car) => void;
}

export function CarSelector({ cars, loading, selectedCar, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');

  const brands = useMemo(() => {
    const set = new Set(cars.map(c => c.brand));
    return Array.from(set).sort();
  }, [cars]);

  const filtered = useMemo(() => {
    return cars.filter(car => {
      const matchSearch = !search ||
        `${car.brand} ${car.model} ${car.plateNumber}`.toLowerCase().includes(search.toLowerCase());
      const matchBrand = !filterBrand || car.brand === filterBrand;
      return matchSearch && matchBrand;
    });
  }, [cars, search, filterBrand]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        <span className="ml-3 text-gray-500">Загрузка автомобилей...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Шаг 1: Выберите автомобиль</h3>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Поиск по марке, модели или номеру..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field flex-1"
        />
        <select
          value={filterBrand}
          onChange={e => setFilterBrand(e.target.value)}
          className="input-field w-48"
        >
          <option value="">Все марки</option>
          {brands.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Car list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
        {filtered.map(car => (
          <button
            key={car.id}
            onClick={() => onSelect(car)}
            className={`text-left rounded-lg border-2 transition-all hover:shadow-md ${
              selectedCar?.id === car.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <div className="flex items-center gap-3 p-3">
              {/* Photo — compact square ~20% of card width */}
              <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                {car.galleryPhotoUrl ? (
                  <img
                    src={car.galleryPhotoUrl}
                    alt={`${car.brand} ${car.model}`}
                    className="w-full h-full object-cover"
                    onError={e => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = 'none';
                      el.parentElement!.innerHTML = '<svg class="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>';
                    }}
                  />
                ) : (
                  <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                  </svg>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {car.brand} {car.model}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {car.year} | {car.color} | {car.bodyType}
                    </p>
                    <p className="text-xs font-mono text-gray-600 mt-0.5">
                      {car.plateNumber}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Депозит</p>
                    <p className="text-sm font-semibold text-gray-700">${car.deposit || '—'}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {car.transmission}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {car.fuel}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {car.seats} мест
                  </span>
                  {car.climate && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                      {car.climate}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          Автомобили не найдены. Измените параметры поиска.
        </p>
      )}

      <p className="text-sm text-gray-400">
        Показано {filtered.length} из {cars.length} автомобилей (только со статусом «готово»)
      </p>
    </div>
  );
}
