'use client';

import { useState, useEffect, useCallback } from 'react';
import { Fine, FinesCheckResult } from '@/types';

const SOURCE_LABELS: Record<string, string> = {
  'protocols.ge': 'protocols.ge',
  'videos.police.ge': 'videos.police.ge',
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Оплачен', cls: 'text-green-700 bg-green-50' },
  unpaid: { label: 'Не оплачен', cls: 'text-red-700 bg-red-50' },
  PAID: { label: 'Оплачен', cls: 'text-green-700 bg-green-50' },
  UNPAID: { label: 'Не оплачен', cls: 'text-red-700 bg-red-50' },
};

function formatDate(iso: string) {
  if (!iso) return '—';
  // Handle both ISO dates and Georgian date formats
  const d = new Date(iso);
  if (!isNaN(d.getTime())) return d.toLocaleDateString('ru-RU');
  return iso;
}

function formatAmount(amount: number, currency: string) {
  if (!amount) return '—';
  return `${amount.toLocaleString('ru-RU')} ${currency}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  return `${Math.floor(hours / 24)} дн. назад`;
}

export default function FinesPage() {
  const [result, setResult] = useState<FinesCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showScriptInfo, setShowScriptInfo] = useState(false);
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterCar, setFilterCar] = useState<string>('all');

  const loadCached = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fines');
      const json = await res.json();
      if (json.data) setResult(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  const fines = result?.fines || [];
  const unpaidFines = fines.filter(f =>
    !f.status || f.status.toLowerCase().includes('unpaid') || f.status.toLowerCase().includes('не опла')
  );

  const cars = [...new Set(fines.map(f => f.carPlate))];

  const filteredFines = fines.filter(f => {
    if (filterSource !== 'all' && f.source !== filterSource) return false;
    if (filterCar !== 'all' && f.carPlate !== filterCar) return false;
    return true;
  });

  return (
    <div className="max-w-6xl">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Штрафы</h2>
          {result && (
            <p className="text-sm text-gray-500 mt-0.5">
              Последняя проверка: {timeAgo(result.checkedAt)} · проверено {result.carsChecked} авто
              {result.carsSkipped > 0 && `, пропущено ${result.carsSkipped} (транзит)`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadCached}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : '↻'} Обновить
          </button>
          <button
            onClick={() => setShowScriptInfo(v => !v)}
            className="btn-primary"
          >
            Как проверить штрафы?
          </button>
        </div>
      </div>

      {/* Script info banner */}
      {showScriptInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-sm">
          <p className="font-medium text-blue-800 mb-2">Проверка запускается локально с вашего компьютера</p>
          <p className="text-blue-700 mb-2">
            Грузинские сайты (videos.police.ge, protocols.ge) блокируют запросы с облачных серверов.
            Скрипт нужно запускать на компьютере в Грузии:
          </p>
          <code className="block bg-blue-100 text-blue-900 rounded px-3 py-2 font-mono text-xs mb-2">
            cd C:\Users\Admin\code\globuscar-rental{'\n'}
            node scripts/check-fines.js
          </code>
          <p className="text-blue-600 text-xs">
            Результаты автоматически загружаются в панель. Можно добавить в Планировщик задач Windows для ежедневного запуска.
          </p>
        </div>
      )}

      {/* No data state */}
      {!result && !loading && (
        <div className="card text-center py-16">
          <div className="text-4xl mb-4">🚗</div>
          <p className="text-gray-500 text-lg">Данные ещё не загружены</p>
          <p className="text-gray-400 text-sm mt-2">Нажмите «Проверить штрафы» для первой проверки</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card text-center py-4">
              <div className="text-2xl font-bold text-gray-900">{fines.length}</div>
              <div className="text-sm text-gray-500 mt-1">Всего штрафов</div>
            </div>
            <div className="card text-center py-4">
              <div className={`text-2xl font-bold ${unpaidFines.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {unpaidFines.length}
              </div>
              <div className="text-sm text-gray-500 mt-1">Не оплачено</div>
            </div>
            <div className="card text-center py-4">
              <div className="text-2xl font-bold text-gray-900">{result.carsChecked}</div>
              <div className="text-sm text-gray-500 mt-1">Авто проверено</div>
            </div>
            <div className="card text-center py-4">
              <div className={`text-2xl font-bold ${result.errors.length > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                {result.errors.length}
              </div>
              <div className="text-sm text-gray-500 mt-1">Ошибок</div>
            </div>
          </div>

          {/* Filters */}
          {fines.length > 0 && (
            <div className="flex gap-3 mb-4">
              <select
                value={filterSource}
                onChange={e => setFilterSource(e.target.value)}
                className="input-field w-auto text-sm"
              >
                <option value="all">Все источники</option>
                <option value="protocols.ge">protocols.ge</option>
                <option value="videos.police.ge">videos.police.ge</option>
              </select>
              {cars.length > 1 && (
                <select
                  value={filterCar}
                  onChange={e => setFilterCar(e.target.value)}
                  className="input-field w-auto text-sm"
                >
                  <option value="all">Все автомобили</option>
                  {cars.map(plate => (
                    <option key={plate} value={plate}>{plate}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Fines table */}
          {filteredFines.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-600 font-medium">Штрафов не найдено</p>
              <p className="text-gray-400 text-sm mt-1">По всем автомобилям с гос. номером штрафов нет</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Автомобиль</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Источник</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Номер штрафа</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Дата</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Место / Нарушение</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Сумма</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Статус</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Ссылка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredFines.map(fine => {
                      const statusInfo = STATUS_LABELS[fine.status] || null;
                      return (
                        <tr key={fine.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{fine.carPlate}</div>
                            <div className="text-xs text-gray-400">{fine.carName}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                              {fine.source}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-700">
                            {fine.fineNumber || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {formatDate(fine.violationDate)}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            {fine.location && (
                              <div className="text-gray-700 truncate">{fine.location}</div>
                            )}
                            {fine.violation && (
                              <div className="text-xs text-gray-400 truncate">{fine.violation}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                            {formatAmount(fine.amount, fine.currency)}
                          </td>
                          <td className="px-4 py-3">
                            {statusInfo ? (
                              <span className={`text-xs rounded px-1.5 py-0.5 ${statusInfo.cls}`}>
                                {statusInfo.label}
                              </span>
                            ) : fine.status ? (
                              <span className="text-xs text-gray-500">{fine.status}</span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={fine.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-800 text-xs underline"
                            >
                              Открыть →
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors block */}
          {result.errors.length > 0 && (
            <div className="mt-4">
              <details className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                <summary className="text-sm text-orange-700 font-medium cursor-pointer">
                  Ошибки при проверке ({result.errors.length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-xs text-orange-600">
                      {err.carPlate} / {err.source}: {err.error}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
}
