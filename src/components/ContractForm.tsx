'use client';

import { useState, useEffect, useCallback } from 'react';
import { Car, ClientData, RentalConditions, OutputFormat } from '@/types';
import { CarSelector } from './CarSelector';
import { PassportUploader } from './PassportUploader';
import { RentalForm } from './RentalForm';

type Step = 'car' | 'passport' | 'rental' | 'review';

export function ContractForm() {
  const [step, setStep] = useState<Step>('car');
  const [cars/Cn!Ƥ
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [clientData, setClientData] = useState<ClientData>({
    fullName: '', fullNameEn: '', birthDate: '', passportNumber: '',
    passportIssuedBy: '', passportIssuedDate: '', passportValidUntil: '',
    phone: '', email: '',
  });
}
