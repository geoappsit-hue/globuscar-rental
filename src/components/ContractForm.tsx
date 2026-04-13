'use client';

import { useState, useEffect, useCallback } from 'react';
import { Car, ClientData, RentalConditions, OutputFormat } from '@/types';
import { CarSelector } from './CarSelector';
import { PassportUploader } from './PassportUploader';
import { RentalForm } from './RentalForm';

type Step = 'car' | 'passport' | 'rental' | 'review';

export function ContractForm() {
  const [step, setStep] = useState<Step>('car');
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [clientData, setClientData] = useState<ClientData>({
    fullName: '', fullNameEn: '', birthDate: '', passportNumber: '',
    passportIssuedBy: '', passportIssuedDate: '', passportValidUntil: '',
    phone: '', email: '',
  });
  const [rentalData, setRentalData] = useState<RentalConditions>({
    contractNumber: '', startDate: '', durationDays: 1,
    dailyRate: 0, totalRent: 0, deposit: 0,
    superKasko: false, superKaskoTotal: 0,
    deliveryType: 'self', deliveryCost: 0,
    fuelLevel: '', additionalNotes: '',
  });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ url?: string; format?: string } | null>(null);
  const [error, setError] = useState('');
  const [loadingCars, setLoadingCars] = useState(true);

  useEffect(() => {
    fetch('/api/cars')
      .then(res => res.json())
      .then(data => {
        setCars(data.cars || []);
        setLoadingCars(false);
      })
      .catch(() => setLoadingCars(false));
  }, []);

  // Auto-generate contract number
  useEffect(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
    setRentalData(prev => ({
      ...prev,
      contractNumber: `${month}/${seq}`,
      startDate: now.toISOString().split('T')[0],
    }));
  }, []);

  // Set deposit from car data
  useEffect(() => {
    if (selectedCar) {
      setRentalData(prev => ({
        ...prev,
        deposit: parseInt(selectedCar.deposit) || 200,
        dailyRate: 0, // Will be set manually
      }));
    }
  }, [selectedCar]);

  const handleGenerate = async (format: OutputFormat) => {
    if (!selectedCar) return;

    setGenerating(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId: selectedCar.id,
          client: clientData,
          rental: rentalData,
          format,
        }),
      });

      if (format === 'gdocs') {
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setResult({ url: data.url, format: 'Google Docs' });
      } else {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Contract_${rentalData.contractNumber}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        setResult({ format: format.toUpperCase() });
      }
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const steps: { key: Step; label: string; num: number }[] = [
    { key: 'car', label: 'Автомобиль', num: 1 },
    { key: 'passport', label: 'Клиент', num: 2 },
    { key: 'rental', label: 'Условия', num: 3 },
    { key: 'review', label: 'Генерация', num: 4 },
  ];

  const currentStepIdx = steps.findIndex(s => s.key === step);

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <button
              onClick={() => setStep(s.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                s.key === step
                  ? 'bg-primary-600 text-white'
                  : i < currentStepIdx
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                s.key === step ? 'bg-white/20' : i < currentStepIdx ? 'bg-primary-200' : 'bg-gray-200'
              }`}>
                {i < currentStepIdx ? '✓' : s.num}
              </span>
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${i < currentStepIdx ? 'bg-primary-300' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="card">
        {step === 'car' && (
          <CarSelector
            cars={cars}
            loading={loadingCars}
            selectedCar={selectedCar}
            onSelect={(car) => {
              setSelectedCar(car);
              setStep('passport');
            }}
          />
        )}

        {step === 'passport' && (
          <PassportUploader
            clientData={clientData}
            onChange={setClientData}
            onNext={() => setStep('rental')}
            onBack={() => setStep('car')}
          />
        )}

        {step === 'rental' && (
          <RentalForm
            rentalData={rentalData}
            selectedCar={selectedCar}
            onChange={setRentalData}
            onNext={() => setStep('review')}
            onBack={() => setStep('passport')}
          />
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Проверка и генерация</h3>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Автомобиль</h4>
                <p className="font-semibold">{selectedCar?.brand} {selectedCar?.model}</p>
                <p className="text-sm text-gray-600">{selectedCar?.plateNumber} | {selectedCar?.year} | {selectedCar?.color}</p>
                <p className="text-sm text-gray-600">VIN: {selectedCar?.vin}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Клиент</h4>
                <p className="font-semibold">{clientData.fullNameEn || clientData.fullName}</p>
                <p className="text-sm text-gray-600">Паспорт: {clientData.passportNumber}</p>
                <p className="text-sm text-gray-600">Тел: {clientData.phone}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Условия</h4>
                <p className="font-semibold">Договор {rentalData.contractNumber}</p>
                <p className="text-sm text-gray-600">Начало: {rentalData.startDate}</p>
                <p className="text-sm text-gray-600">{rentalData.durationDays} сут. | {rentalData.dailyRate} USD/сут. | Итого: {rentalData.totalRent} USD</p>
                <p className="text-sm text-gray-600">Депозит: {rentalData.deposit} USD</p>
                {rentalData.superKasko && (
                  <p className="text-sm text-gray-600">Super КАСКО: {rentalData.superKaskoTotal} USD</p>
                )}
                {rentalData.deliveryType && (
                  <p className="text-sm text-gray-600">Доставка ({rentalData.deliveryType}): {rentalData.deliveryCost} USD</p>
                )}
                {rentalData.fuelLevel && (
                  <p className="text-sm text-gray-600">Топливо: {rentalData.fuelLevel}</p>
                )}
              </div>
            </div>

            {/* Generate buttons */}
            <div className="border-t pt-6">
              <p className="text-sm text-gray-500 mb-4">Выберите формат договора:</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleGenerate('gdocs')}
                  disabled={generating}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                  </svg>
                  Google Docs
                </button>
                <button
                  onClick={() => handleGenerate('docx')}
                  disabled={generating}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                  </svg>
                  Word (.docx)
                </button>
                <button
                  onClick={() => handleGenerate('pdf')}
                  disabled={generating}
                  className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                  </svg>
                  PDF
                </button>
              </div>
            </div>

            {generating && (
              <div className="flex items-center gap-3 text-primary-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
                <span>Генерация договора...</span>
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">Договор успешно сгенерирован!</p>
                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline text-sm mt-1 inline-block"
                  >
                    Открыть в {result.format} →
                  </a>
                )}
                {!result.url && (
                  <p className="text-green-600 text-sm mt-1">Файл {result.format} загружен</p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <button onClick={() => setStep('rental')} className="btn-secondary">
              ← Назад
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
