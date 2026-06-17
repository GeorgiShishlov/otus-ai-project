'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  rateToBase: number;
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt]   = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/currencies');
    setCurrencies(data);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const { data } = await api.post('/currencies/refresh', {});
      setCurrencies(data.currencies);
      setUpdatedAt(new Date());
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const rub = currencies.find(c => c.code === 'RUB');

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Курсы валют</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {updatedAt
              ? `Обновлено: ${updatedAt.toLocaleTimeString('ru-RU')}`
              : 'Данные ЦБ РФ'}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {refreshing ? 'Загрузка...' : '↻ Обновить курсы'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Загрузка...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Валюта</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Курс к ₽</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">1 ₽ =</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currencies.map((c) => {
                const perRub = c.code === 'RUB' ? 1 : c.rateToBase;
                const rubPer = c.code === 'RUB' ? 1 : 1 / c.rateToBase;
                return (
                  <tr key={c.code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-300 w-6 text-center">{c.symbol}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.code}</p>
                          <p className="text-xs text-gray-400">{c.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.code === 'RUB' ? (
                        <span className="text-sm text-gray-400">—</span>
                      ) : (
                        <span className="text-sm font-semibold text-gray-800">
                          {(1 / c.rateToBase).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.code === 'RUB' ? (
                        <span className="text-sm text-gray-400">—</span>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {c.rateToBase.toFixed(4)} {c.symbol}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-300 text-center">
        Источник: Центральный банк Российской Федерации
      </p>
    </div>
  );
}
