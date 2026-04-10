'use client';

import { useState, useMemo } from 'react';
import { Car } from 'A/types';

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
            className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
              selectedCar?.id === car.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">
                  {car.brand} {car.model}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {car.year} | {car.color} | {car.bodyType}
                </p>
                <p className="text-sm font-mono text-gray-600 mt-1">
                  {car.plateNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Депозит</p>
                <p className="text-sm font-semibold text-gray-700">${car.deposit || '—'}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {car.transmission}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {car.fuel}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {car.seats} мест
              </span>
              {car.climate && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                  {car.climate}
                </span>
              )}
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
  
)#��