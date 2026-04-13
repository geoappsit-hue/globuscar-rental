'use client';

import { useState, useRef } from 'react';
import { ClientData } from '@/types';

interface Props {
  clientData: ClientData;
  onChange: (data: ClientData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PassportUploader({ clientData, onChange, onNext, onBack }: Props) {
  const [processing, setProcessing] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);

      // Send to OCR
      setProcessing(true);
      setOcrError('');

      try {
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          onChange({
            ...clientData,
            ...result.data,
            phone: clientData.phone, // Keep manually entered phone
            email: clientData.email,
          });
          setOcrDone(true);
        } else {
          setOcrError(result.error || 'Не удалось распознать паспорт. Заполните данные вручную.');
        }
      } catch {
        setOcrError('Ошибка подключения к серверу OCR. Заполните данные вручную.');
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateField = (field: keyof ClientData, value: string) => {
    onChange({ ...clientData, [field]: value });
  };

  const isValid = clientData.fullName || clientData.fullNameEn;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Шаг 2: Данные клиента</h3>

      {/* Photo upload area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {preview ? (
          <div className="space-y-3">
            <img src={preview} alt="Passport" className="max-h-48 mx-auto rounded-lg shadow" />
            {processing && (
              <div className="flex items-center justify-center gap-2 text-primary-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
                <span className="text-sm">Распознавание паспорта...</span>
              </div>
            )}
            {ocrDone && (
              <p className="text-green-600 text-sm">Данные распознаны. Проверьте и исправьте при необходимости.</p>
            )}
            {ocrError && (
              <p className="text-amber-600 text-sm">{ocrError}</p>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-primary-600 hover:underline"
            >
              Загрузить другое фото
            </button>
          </div>
        ) : (
          <div>
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              Загрузить фото паспорта
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Система автоматически распознает данные из фото паспорта
            </p>
          </div>
        )}
      </div>

      {/* Manual fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="input-label">ФИО (English) *</label>
          <input
            type="text"
            value={clientData.fullNameEn}
            onChange={e => updateField('fullNameEn', e.target.value)}
            className="input-field"
            placeholder="SURNAME FIRSTNAME"
          />
        </div>
        <div>
          <label className="input-label">ФИО (если есть кириллица)</label>
          <input
            type="text"
            value={clientData.fullName}
            onChange={e => updateField('fullName', e.target.value)}
            className="input-field"
            placeholder="Фамилия Имя Отчество"
          />
        </div>
        <div>
          <label className="input-label">Дата рождения</label>
          <input
            type="text"
            value={clientData.birthDate}
            onChange={e => updateField('birthDate', e.target.value)}
            className="input-field"
            placeholder="ДД.ММ.ГГГГ"
          />
        </div>
        <div>
          <label className="input-label">Номер паспорта *</label>
          <input
            type="text"
            value={clientData.passportNumber}
            onChange={e => updateField('passportNumber', e.target.value)}
            className="input-field"
            placeholder="Серия и номер"
          />
        </div>
        <div>
          <label className="input-label">Кем выдан</label>
          <input
            type="text"
            value={clientData.passportIssuedBy}
            onChange={e => updateField('passportIssuedBy', e.target.value)}
            className="input-field"
            placeholder="Орган, выдавший паспорт"
          />
        </div>
        <div>
          <label className="input-label">Дата выдачи</label>
          <input
            type="text"
            value={clientData.passportIssuedDate}
            onChange={e => updateField('passportIssuedDate', e.target.value)}
            className="input-field"
            placeholder="ДД.ММ.ГГГГ"
          />
        </div>
        <div>
          <label className="input-label">Действителен до</label>
          <input
            type="text"
            value={clientData.passportValidUntil}
            onChange={e => updateField('passportValidUntil', e.target.value)}
            className="input-field"
            placeholder="ДД.ММ.ГГГГ"
          />
        </div>
        <div>
          <label className="input-label">Телефон клиента *</label>
          <input
            type="tel"
            value={clientData.phone}
            onChange={e => updateField('phone', e.target.value)}
            className="input-field"
            placeholder="+7..."
          />
        </div>
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
          Далее →
        </button>
      </div>
    </div>
  );
}
