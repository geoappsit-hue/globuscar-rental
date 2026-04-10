'use client';

import { useEffect } from 'react';
import { Car, RentalConditions } from '@/types';

interface Props {
  rentalData: RentalConditions;
  selectedCar: Car | null;
  onChange: (data: RentalConditions) => void;
  onNext: () => void;
  onBack: () => void;
}

const DELIVERY_OPTIONS = [
  { value: 'self', label: 'Самовывоз (бесплатно)', cost: 0 },
  { value: 'tbilisi', label: 'Доставка по Тбилиси (10 USD)', cost: 10 },
  { value: 'airport', label: 'Аэропорт Тбилиси (20 USD)', cost: 20 },
  { value: 'other', label: 'Другое (индивидуально)', cost: 0 },
];

export function RentalForm({ rentalData, selectedCar, onChange, onNext, onBack }: Props) {
  // Recalculate totals
  useEffect(() => {
    const totalRent = rentalData.dailyRate * rentalData.durationDays;
    const superKaskoTotal = rentalData.superKasko ? 20 * rentalData.durationDays : 0;

    if (totalRent !== rentalData.totalRent || superKaskoTotal !== rentalData.superKaskoTotal) {
      onChange({
        ...rentalData,
        totalRent,
        superKaskoTotal,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentalData.dailyRate, rentalData.durationDays, rentalData.superKasko]);

  const update = (field: keyof RentalConditions, value: any) => {
    onChange({ ...rentalData, [field]: value });
  };

  const handleDeliveryChange = (value: string) => {
    const option = DELIVERY_OPTIONS.find(o => o.value === value);
    onChange({
      ...rentalData,
      deliveryType: value,
      deliveryCost: option?.cost || 0,
    });
  };

  const isValid = rentalData.contractNumber && rentalData.startDate &&
    rentalData.durationDays > 0 && rentalData.dailyRate > 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Шаг 3: Условия аренды</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contract number */}
        <div>
          <label className="input-label">Номер договора *</label>
          <input
            type="text"
            value={rentalData.contractNumber}
            onChange={e => update('contractNumber', e.target.value)}
            className="input-field"
            placeholder="04/0155"
          />
        </div>

        {/* Start date */}
        <div>
          <label className="input-label">Дата начала аренды *</label>
          <input
            type="date"
            value={rentalData.startDate}
            onChange={e => update('startDate', e.target.value)}
            className="input-field"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="input-label">Срок аренды (суток) *</label>
          <input
            type="number"
            min={1}
            value={rentalData.durationDays}
            onChange={e => update('durationDays', parseInt(e.target.value) || 1)}
            className="input-field"
          />
        </div>

        {/* Daily rate */}
        <div>
          <label className="input-label">Стоимость аренды в сутки (USD) *</label>
          <input
            type="number"
            min={0}
            value={rentalData.dailyRate}
            onChange={e => update('dailyRate', parseFloat(e.target.value) || 0)}
            className="input-field"
          />
        </div>

        {/* Deposit */}
        <div>
          <label className="input-label">Депозит (USD)</label>
          <input
            type="number"
            min={0}
            value={rentalData.deposit}
            onChange={e => update('deposit', parseFloat(e.target.value) || 0)}
            className="input-field"
          />
          {selectedCar?.deposit && (
            <p className="text-xs text-gray-400 mt-1">
              По умолчанию из базы: ${selectedCar.deposit}
            </p>
          )}
        </div>

        {/* Fuel level */}
        <div>
          <label className="input-label">Уровень топлива при передаче</label>
          <input
            type="text"
            value={rentalData.fuelLevel}
            onChange={e => update('fuelLevel', e.target.value)}
            className="input-field"
            placeholder="Например: 3/4 бака"
          />
        </div>
      </div>

      {/* Additional services */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Дополнительные услуги</h4>

        {/* SuperKasko */}
        <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={rentalData.superKasko}
            onChange={e => update('superKasko', e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <div>
            <span className="text-sm font-medium">СуперКАСКО</span>
            <span className="text-sm text-gray-500 ml-2">20 USD/сутки</span>
          </div>
        </label>

        {/* Delivery */}
        <div className="mt-3">
          <label className="input-label">Доставка автомобиля</label>
          <select
            value={rentalData.deliveryType}
            onChange={e => handleDeliveryChange(e.target.value)}
            className="input-field"
          >
            {DELIVERY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {rentalData.deliveryType === 'other' && (
          <div className="mt-2">
            <label className="input-label">Стоимость доставки (USD)</label>
            <input
              type="number"
              min={0}
              value={rentalData.deliveryCost}
              onChange={e => update('deliveryCost', parseFloat(e.target.value) || 0)}
              className="input-field"
            />
          </div>
        )}
      </div>

      {/* Summary box */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-primary-800 mb-2">Итого</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-600">Аренда ({rentalData.durationDays} суток):</span>
          <span className="font-semibold text-right">{rentalData.totalRent} USD</span>

          {rentalData.superKasko && (
            <>
              <span className="text-gray-600">СуперКАСКО:</span>
              <span className="font-semibold text-right">{rentalData.superKaskoTotal} USD</span>
            </>
          )}

          {rentalData.deliveryCost > 0 && (
            <>
              <span className="text-gray-600">Доставка:</span>
              <span className="font-semibold text-right">{rentalData.deliveryCost} USD</span>
            </>
          )}

          <span className="text-gray-600">Депозит:</span>
          <span className="font-semibold text-right">{rentalData.deposit} USD</span>

          <div className="col-span-2 border-t border-primary-200 my-1" />
          <span className="font-medium text-primary-800">К оплате (без депозита):</span>
          <span className="font-bold text-right text-primary-800">
            {rentalData.totalRent + rentalData.superKaskoTotal + rentalData.deliveryCost} USD
          </span>
        </div>
      </div>

      {/* Additional notes */}
      <div>
        <label className="input-label">Дополнительные примечания</label>
        <textarea
          value={rentalData.additionalNotes}
          onChange={e => update('additionalNotes', e.target.value)}
          className="input-field"
          rows={2}
          placeholder="Необязательно"
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="btn-secondary">
          ← Назад
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="btn-primary"
        >
          Далее: Проверка →
        </button>
      </div>
    </div>
  );
}
