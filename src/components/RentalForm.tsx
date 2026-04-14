'use client';

import { useEffect, useState } from 'react';
import { Car, RentalConditions, LocationOption } from '@/types';

interface Props {
  rentalData: RentalConditions;
  selectedCar: Car | null;
  onChange: (data: RentalConditions) => void;
  onNext: () => void;
  onBack: () => void;
}

export function RentalForm({ rentalData, selectedCar, onChange, onNext, onBack }: Props) {
  const [locationOptions, setLocationOptions] = useState<{ delivery: LocationOption[]; return: LocationOption[] }>({
    delivery: [],
    return: [],
  });

  useEffect(() => {
    fetch('/api/locations')
      .then(r => r.json())
      .then(data => {
        if (data.delivery) setLocationOptions({ delivery: data.delivery, return: data.return });
      })
      .catch(() => {});
  }, []);

  // Recalculate totals
  useEffect(() => {
    const totalRent = rentalData.dailyRate * rentalData.durationDays;
    const insuranceTotal = rentalData.insuranceType !== 'kasko'
      ? rentalData.insuranceDailyRate * rentalData.durationDays
      : 0;
    if (totalRent !== rentalData.totalRent || insuranceTotal !== rentalData.insuranceTotal) {
      onChange({ ...rentalData, totalRent, insuranceTotal });
    }
  }, [rentalData.dailyRate, rentalData.durationDays, rentalData.insuranceType, rentalData.insuranceDailyRate]);

  const update = (field: keyof RentalConditions, value: any) => {
    onChange({ ...rentalData, [field]: value });
  };

  const handleDeliverySelect = (value: string) => {
    const option = locationOptions.delivery.find(o => o.value === value);
    const isOther = !option || option.label === 'Другое';
    onChange({
      ...rentalData,
      deliveryType: value,
      deliveryLocation: isOther ? '' : (option?.label || ''),
      deliveryCost: isOther ? 0 : (option?.cost || 0),
    });
  };

  const handleReturnSelect = (value: string) => {
    const option = locationOptions.return.find(o => o.value === value);
    const isOther = !option || option.label === 'Другое';
    onChange({
      ...rentalData,
      returnType: value,
      returnLocation: isOther ? '' : (option?.label || ''),
      returnCost: isOther ? 0 : (option?.cost || 0),
    });
  };

  const isDeliveryOther = locationOptions.delivery.find(o => o.value === rentalData.deliveryType)?.label === 'Другое';
  const isReturnOther = locationOptions.return.find(o => o.value === rentalData.returnType)?.label === 'Другое';
  const insuranceHasCost = rentalData.insuranceType === 'super_kasko' || rentalData.insuranceType === 'full_coverage';

  const handleInsuranceChange = (type: string) => {
    onChange({
      ...rentalData,
      insuranceType: type,
      insuranceDailyRate: type === 'kasko' ? 0 : rentalData.insuranceDailyRate,
      insuranceTotal: type === 'kasko' ? 0 : rentalData.insuranceDailyRate * rentalData.durationDays,
    });
  };

  const isValid = rentalData.contractNumber && rentalData.startDate &&
    rentalData.durationDays > 0 && rentalData.dailyRate > 0;

  const totalPayable = rentalData.totalRent + rentalData.insuranceTotal + rentalData.deliveryCost + rentalData.returnCost;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Шаг 3: Условия аренды</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contract number */}
        <div>
          <label className="input-label">Номер договора *</label>
          <input type="text" value={rentalData.contractNumber}
            onChange={e => update('contractNumber', e.target.value)}
            className="input-field" placeholder="04/0155" />
        </div>

        {/* Start date */}
        <div>
          <label className="input-label">Дата начала аренды *</label>
          <input type="date" value={rentalData.startDate}
            onChange={e => update('startDate', e.target.value)}
            className="input-field" />
        </div>

        {/* Duration */}
        <div>
          <label className="input-label">Срок аренды (суток) *</label>
          <input type="number" min={1} value={rentalData.durationDays}
            onChange={e => update('durationDays', parseInt(e.target.value) || 1)}
            onFocus={e => e.target.select()}
            className="input-field" />
        </div>

        {/* Daily rate */}
        <div>
          <label className="input-label">Стоимость аренды в сутки (USD) *</label>
          <input type="number" min={0} value={rentalData.dailyRate}
            onChange={e => update('dailyRate', parseFloat(e.target.value) || 0)}
            onFocus={e => e.target.select()}
            className="input-field" />
        </div>

        {/* Deposit */}
        <div>
          <label className="input-label">Депозит (USD)</label>
          <input type="number" min={0} value={rentalData.deposit}
            onChange={e => update('deposit', parseFloat(e.target.value) || 0)}
            onFocus={e => e.target.select()}
            className="input-field" />
          {selectedCar?.deposit && (
            <p className="text-xs text-gray-400 mt-1">По умолчанию из базы: ${selectedCar.deposit}</p>
          )}
        </div>

        {/* Franchise */}
        <div>
          <label className="input-label">Франшиза (GEL)</label>
          <input type="number" min={0} value={rentalData.franchise}
            onChange={e => update('franchise', parseFloat(e.target.value) || 0)}
            onFocus={e => e.target.select()}
            className="input-field" />
          <p className="text-xs text-gray-400 mt-1">По умолчанию: 500 GEL</p>
        </div>

        {/* Fuel level */}
        <div>
          <label className="input-label">Уровень топлива при передаче</label>
          <input type="text" value={rentalData.fuelLevel}
            onChange={e => update('fuelLevel', e.target.value)}
            className="input-field" placeholder="Например: 3/4 бака" />
        </div>
      </div>

      {/* Additional services */}
      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Дополнительные услуги</h4>

        {/* Insurance */}
        <div className="space-y-2">
          <label className="input-label">Страховка</label>
          <select
            value={rentalData.insuranceType}
            onChange={e => handleInsuranceChange(e.target.value)}
            className="input-field"
          >
            <option value="kasko">КАСКО</option>
            <option value="super_kasko">СуперКАСКО</option>
            <option value="full_coverage">Полное покрытие</option>
          </select>
          {insuranceHasCost && (
            <div>
              <label className="input-label">Стоимость страховки в сутки (USD)</label>
              <input
                type="number" min={0}
                value={rentalData.insuranceDailyRate}
                onChange={e => update('insuranceDailyRate', parseFloat(e.target.value) || 0)}
                onFocus={e => e.target.select()}
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1">
                Итого: {rentalData.insuranceDailyRate * rentalData.durationDays} USD ({rentalData.insuranceDailyRate} × {rentalData.durationDays} сут.)
              </p>
            </div>
          )}
        </div>

        {/* Delivery */}
        <div className="space-y-2">
          <label className="input-label">Доставка автомобиля</label>
          <select value={rentalData.deliveryType} onChange={e => handleDeliverySelect(e.target.value)} className="input-field">
            <option value="">— не выбрано —</option>
            {locationOptions.delivery.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {rentalData.deliveryType && (
            <div className="grid grid-cols-2 gap-2">
              {isDeliveryOther && (
                <div>
                  <label className="input-label">Место доставки</label>
                  <input type="text" value={rentalData.deliveryLocation}
                    onChange={e => update('deliveryLocation', e.target.value)}
                    className="input-field" placeholder="Укажите место" />
                </div>
              )}
              <div className={isDeliveryOther ? '' : 'col-span-2'}>
                <label className="input-label">Стоимость доставки (USD)</label>
                <input type="number" min={0} value={rentalData.deliveryCost}
                  onChange={e => update('deliveryCost', parseFloat(e.target.value) || 0)}
                  onFocus={e => e.target.select()}
                  className="input-field" />
              </div>
            </div>
          )}
        </div>

        {/* Return */}
        <div className="space-y-2">
          <label className="input-label">Возврат автомобиля</label>
          <select value={rentalData.returnType} onChange={e => handleReturnSelect(e.target.value)} className="input-field">
            <option value="">— не выбрано —</option>
            {locationOptions.return.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {rentalData.returnType && (
            <div className="grid grid-cols-2 gap-2">
              {isReturnOther && (
                <div>
                  <label className="input-label">Место возврата</label>
                  <input type="text" value={rentalData.returnLocation}
                    onChange={e => update('returnLocation', e.target.value)}
                    className="input-field" placeholder="Укажите место" />
                </div>
              )}
              <div className={isReturnOther ? '' : 'col-span-2'}>
                <label className="input-label">Стоимость возврата (USD)</label>
                <input type="number" min={0} value={rentalData.returnCost}
                  onChange={e => update('returnCost', parseFloat(e.target.value) || 0)}
                  onFocus={e => e.target.select()}
                  className="input-field" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary box */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-primary-800 mb-2">Итого</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-600">Аренда ({rentalData.durationDays} суток):</span>
          <span className="font-semibold text-right">{rentalData.totalRent} USD</span>

          {rentalData.insuranceTotal > 0 && (
            <>
              <span className="text-gray-600">{{ kasko: 'КАСКО', super_kasko: 'СуперКАСКО', full_coverage: 'Полное покрытие' }[rentalData.insuranceType]}:</span>
              <span className="font-semibold text-right">{rentalData.insuranceTotal} USD</span>
            </>
          )}

          {rentalData.deliveryCost > 0 && (
            <>
              <span className="text-gray-600">Доставка:</span>
              <span className="font-semibold text-right">{rentalData.deliveryCost} USD</span>
            </>
          )}

          {rentalData.returnCost > 0 && (
            <>
              <span className="text-gray-600">Возврат:</span>
              <span className="font-semibold text-right">{rentalData.returnCost} USD</span>
            </>
          )}

          <span className="text-gray-600">Депозит:</span>
          <span className="font-semibold text-right">{rentalData.deposit} USD</span>

          <div className="col-span-2 border-t border-primary-200 my-1" />
          <span className="font-medium text-primary-800">К оплате (без депозита):</span>
          <span className="font-bold text-right text-primary-800">{totalPayable} USD</span>
        </div>
      </div>

      {/* Additional notes */}
      <div>
        <label className="input-label">Дополнительные примечания</label>
        <textarea value={rentalData.additionalNotes}
          onChange={e => update('additionalNotes', e.target.value)}
          className="input-field" rows={2} placeholder="Необязательно" />
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="btn-secondary">← Назад</button>
        <button onClick={onNext} disabled={!isValid} className="btn-primary">
          Далее: Проверка →
        </button>
      </div>
    </div>
  );
}
