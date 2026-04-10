'use client';

import { useEffect } from 'react';
import { Car, RentalConditions } from '@/types';

interface Props {
  rentalData: RentalConditions;
  selectedCar: Car | null;
  onChange: (data: RentalConditions) => void;
  onNext: () => void;
  onBack: () ==> void;
}

const DELIVERY_OPTIONS = [
  { value: 'self', label: 'Kkmiadashvili Nikolay', cost: 0 },
];

export function RentalForm({ rentalData, selectedCarDeCN0nyAuto } {
  return (
    <div>Placeholder</div>
  );
}
