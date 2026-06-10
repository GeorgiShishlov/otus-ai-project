'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

interface Mapping {
  amount: string;
  date: string;
  type: string;
  categoryName: string;
  description: string;
}

interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

export default function CsvPage() {
  // ── Import state ──────────────────────────────────
  const [csvText, setCsvText]       = useState('');
  const [headers, setHeaders]       = useState<string[]>([]);
  const [mapping, setMapping]       = useState<Mapping>({ amount: '', date: '', type: '', categoryName: '', description: '' });
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Export state ──────────────────────────────────
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [expType, setExpType]       = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expDateFrom, setExpDateFrom] = useState('');
  const [expDateTo, setExpDateTo]   = useState('');
  const [exporting, setExporting]   = useState(false);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data));
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setImportResult(null);
      const firstLine = text.split('\n')[0] ?? '';
      const cols = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      setHeaders(cols);
      // авто-маппинг по именам колонок
      const find = (keys: string[]) => cols.find(c => keys.some(k => c.toLowerCase().includes(k))) ?? '';
      setMapping({
        amount:       find(['amount', 'сумма', 'sum']),
        date:         find(['date', 'дата']),
        type:         find(['type', 'тип']),
        categoryName: find(['category', 'категория']),
        description:  find(['description', 'описание', 'desc']),
      });
    };
    reader.readAsText(file);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!csvText) return;
    setImporting(true);
    setImportResult(null);
    try {
      const { data } = await api.post('/csv/import', { content: csvText, mapping });
      setImportResult(data);
      if (data.imported > 0) {
        setCsvText('');
        setHeaders([]);
        if (fileRef.current) fileRef.current.value = '';
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (expType)     params.set('type', expType);
      if (expCategory) params.set('categoryId', expCategory);
      if (expDateFrom) params.set('dateFrom', expDateFrom);
      if (expDateTo)   params.set('dateTo', expDateTo);

      const url = `${process.env.NEXT_PUBLIC_API_URL}/csv/export?${params}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  }

  const mappingFields: { key: keyof Mapping; label: string; required: boolean }[] = [
    { key: 'amount',       label: 'Сумма',      required: true },
    { key: 'date',         label: 'Дата',        required: true },
    { key: 'type',         label: 'Тип (INCOME/EXPENSE)', required: true },
    { key: 'categoryName', label: 'Категория',   required: true },
    { key: 'description',  label: 'Описание',    required: false },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-800">Импорт / Экспорт CSV</h1>

      {/* ── Импорт ───────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Импорт транзакций</h2>

        <label className="block mb-4">
          <span className="text-xs text-gray-500 mb-1 block">CSV-файл</span>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
        </label>

        {headers.length > 0 && (
          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Маппинг колонок</p>
              <div className="space-y-2">
                {mappingFields.map(({ key, label, required }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-44 shrink-0">
                      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                    </span>
                    <select
                      value={mapping[key]}
                      onChange={e => setMapping(m => ({ ...m, [key]: e.target.value }))}
                      required={required}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— не выбрано —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={importing}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {importing ? 'Импортируем...' : 'Импортировать'}
            </button>
          </form>
        )}

        {importResult && (
          <div className={`mt-4 rounded-lg p-3 text-sm ${importResult.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            <p className="font-medium">Импортировано: {importResult.imported}, ошибок: {importResult.failed}</p>
            {importResult.errors.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs">
                {importResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Экспорт ──────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Экспорт транзакций</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Тип</label>
            <select value={expType} onChange={e => setExpType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Все</option>
              <option value="INCOME">Доходы</option>
              <option value="EXPENSE">Расходы</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Категория</label>
            <select value={expCategory} onChange={e => setExpCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Все категории</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Дата от</label>
            <input type="date" value={expDateFrom} onChange={e => setExpDateFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Дата до</label>
            <input type="date" value={expDateTo} onChange={e => setExpDateTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <button onClick={handleExport} disabled={exporting}
          className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
          {exporting ? 'Скачиваем...' : 'Скачать CSV'}
        </button>
      </div>
    </div>
  );
}
