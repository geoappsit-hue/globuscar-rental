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
  { value: 'self', label: '–°–∞–º–æ–≤—ã–≤–æ–∑ (–±–µ—Å–ø–ª–∞—Ç–Ω–æ)', cost: 0 },
  { value: 'tbilisi', label: '–î–æ—Å—Ç–∞–≤–∫–∞ –ø–æ –¢–±–∏–ª–∏—Å–∏ (10 USD)', cost: 10 },
  { value: 'ai•¡Ω…–ú∞Å±Öâï∞ËÄüBCF7FB˚BˇBˇFFÉBãB«B„BÔB„FB‡Ä†»¿ÅUM§ú∞ÅçΩÕ–ËÄ»¿ÅÙ∞(ÄÅÏÅŸÖ±’îËÄùΩ—°ï»ú∞Å±Öâï∞ËÄüBSFFF3–æ–µ (–∏–Ω–¥–∏–≤–∏–¥—É–∞–ª—å–Ω–æ)', cost: 0 },
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
      <h3 className="text-lg font-semibold">–®–∞–≥ 3: –£—Å–ª–æ–≤–∏—è –∞—Ä–µ–Ω–¥—ã</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contract number */}
        <div>
          <label className="input-label">–ù–æ–º–µ—Ä –¥–æ–≥–æ–≤–æ—Ä–∞ *</label>
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
          <label className="input-label">–î–∞—Ç–∞ –Ω–∞—á–∞–ª–∞ –∞—Ä–µ–Ω–¥—ã *</label>
          <input
            type="date"
            value={rentalData.startDate}
            onChange={e => update('startDate', e.target.value)}
            className="input-field"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="input-label">–°—Ä–æ–∫ –∞—Ä–µ–Ω–¥—ã (—Å—É—Ç–æ–∫) *</label>
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
          <label className="input-label">–°—Ç–æ–∏–º–æ—Å—Ç—å –∞—Ä–µ–Ω–¥—ã –≤ —Å—É—Ç–∫–∏ (USD) *</label>
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
          <label className="input-label">–î–µ–ø–æ–∑–∏—Ç (USD)</label>
          <input
            type="number"
            min={0}
            value={rentalData.deposit}
            onChange={e => update('deposit', parseFloat(e.target.value) || 0)}
            className="input-field"
          />
          {selectedCar?.deposit && (
            <p className="text-xs text-gray-400 mt-1">
              –ü–æ —É–º–æ–ª—á–∞–Ω–∏—é –∏–∑ –±–∞–∑—ã: ‡†Ç∑selectedCar.deposit}
            </p>
          )}
        </div>

        {/* Fuel level */}
        <div>
          <label className="input-label">–£—Ä–æ–≤–µ–Ω—å —Ç–æ–ø–ª–∏–≤–∞ –ø—Ä8. –ø–µ—Ä–µ–¥–∞—á–µ</label>
          <input
            type="text"
            value={rentalData.fuelLevel}
            onChange={e => update('fuelLevel', e.target.value)}
            className="input-field"
            placeholder="–ù–∞–ø—Ä—Ç–º—ã Ã˛Ãü
          />
        </div>
      </div>

      {/* Additional services */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">–î–æ–ø–æ–ª–Ω–∏—Ç–µ–ª—å–Ω—ã–µ –∞–ª–Ω–Ω—å</h4>

        {/* SuperKasko */}
        <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={rentalData.superKasko}
            onChange={e => update('superKasko', e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <div>
            <span className="text-sm font-medium">–°—É–ø–µ—Ä–ö–ê–°–ö–û</span>
            <span className="text-sm text-gray-500 ml-2">20 USD/—Å—É—Ç–∫–∏</span>
          </div>
        </label>

        {/* Delivery */}
        <div className="mt-3">
          <label className="input-label">–î–æ—Å—Ç–∞–≤–∫–∞ –∞–≤—Ç–æ–º–æ–±–∏–ª—è</label>
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
            <label className="input-label">–°—Ç–æ–∏–º–æ—Å—Ç—å –¥–æ—Å—Ç–∞–≤–∫–∏ (USD)</label>
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
        <h4 className="text-sm font-medium text-primary-800 mb-2">–ò—Ç–æ–≥–æ</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-600">–ê—Ä–µ–Ω–¥–∞ ({rentalData.durationDays} —Å—É—Ç–æ–∫):</span>
          <span className="font-semibold text-right">{rentalData.totalRent} USD</span>

          {rentalData.superKasko && (
            <>
              <span className="text-gray-600">–°—É–ø–µ—Ä–ö–ê–°–ö–û:</span>
              <span className="font-semibold text-right">{rentalData.superKaskoTotal} USD</span>
            </>
          )}

          {rentalData.deliveryCost > 0 && (
            <>
              <span className="text-gray-600">–î–æ—Å—Ç–∞–≤–∫–∞:</span>
              <span className="font-semibold text-right">{rentalData.deliveryCost} USD</span>
            </>
          )}

          <span className="text-gray-600">–î–µ–ø–æ–∑–∏—Ç:</span>
          <span className="font-semibold text-right">{rentalData.deposit} USD</span>

          <div className="col-span-2 border-t border-primary-200 my-1" />
          <span className="font-medium text-primary-800">–ö . –ø–ª–∞—Ç–µ (–±–µ–∑ –¥–µ–ø–æ–∑–∏—Ç–∞):</span>
          <span className="font-bold text-right text-primary-800">
            {rentalData.totalRent + rentalData.superKaskoTotal + rentalData.deliveryCost} TSD</span>
        </div>
      </div>

      {/* Additional notes */}
      <div>
        <label className="input-label">–î–æ–ø–æ–ª–Ω–∏—Ç–µ–ª—å–Ω—ã–µ –ø—Ä—ÇÛB◊FB√B˜B„F<Ω±Öâï∞¯(ÄÄÄÄÄÄÄÄÒ—ï·—Ö…ïÑ(ÄÄÄÄÄÄÄÄÄÅŸÖ±’îıÌ…ïπ—Ö±Ö—ÑπÖëë•—•ΩπÖ±9Ω—ïÕÙ(ÄÄÄÄÄÄÄÄÄÅΩπ°ÖπùîıÌîÄÙ¯Å’¡ëÖ—î†ùÖëë•—•ΩπÖ±9Ω—ïÃú∞Åîπ—Ö…ùï–πŸÖ±’î•Ù(ÄÄÄÄÄÄÄÄÄÅç±ÖÕÕ9ÖµîÙâ•π¡’–µô•ï±êà(ÄÄÄÄÄÄÄÄÄÅ…Ω›ÃıÏ…Ù(ÄÄÄÄÄÄÄÄÄÅ¡±Öçï°Ω±ëï»ÙãBwB◊B˚B«F?BﬂB√FB◊BÔF3B˜B¯à(ÄÄÄÄÄÄÄÄº¯(ÄÄÄÄÄÄΩë•ÿ¯((ÄÄÄÄÄÅÏº®Å9ÖŸ•ùÖ—•Ω∏Ä®ΩÙ(ÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâô±ï‡Å©’Õ—•ô‰µâï—›ïï∏Å¡–¥–à¯(ÄÄÄÄÄÄÄÄÒâ’——Ω∏ÅΩπ±•ç¨ıÌΩπ	Öç≠ÙÅç±ÖÕÕ9ÖµîÙââ—∏µÕïçΩπëÖ…‰à¯(ÄÄÄÄÄÄÄÄÄÉä@ÉBwB√BﬂB√B–(ÄÄÄÄÄÄÄÄΩâ’——Ω∏¯(ÄÄÄÄÄÄÄÄÒâ’——Ω∏(ÄÄÄÄÄÄÄÄÄÅΩπ±•ç¨ıÌΩπ9ï·—Ù(ÄÄÄÄÄÄÄÄÄÅë•ÕÖâ±ïêıÏÖ•ÕYÖ±•ëÙ(ÄÄÄÄÄÄÄÄÄÅç±ÖÕÕ9ÖµîÙââ—∏µ¡…•µÖ…‰à(ÄÄÄÄÄÄÄÄ¯(ÄÄÄÄÄÄÄÄÄÉBSB√BÔB◊B‘ËÉäH(ÄÄÄÄÄÄÄÄΩâ’——Ω∏¯(ÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄΩë•ÿ¯(ÄÄ§Ï)Ù