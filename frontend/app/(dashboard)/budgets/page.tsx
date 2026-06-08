'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Budget {
  id: string;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  month: string;
  category: { name: string; icon: string; color: string };
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categoryId: '', limitAmount: '', month: new Date().toISOString().slice(0, 7) });
  const [saving, setSaving] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  async function load() {
    setLoading(true);
    const { data } = await api.get(`/budgets?month=${currentMonth}`);
    setBudgets(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      setCategories(data);
      if (data.length > 0) setForm(f => ({ ...f, categoryId: data[0].id }));
    });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/budgets', { ...form, limitAmount: parseFloat(form.limitAmount) });
      setShowForm(false);
      setForm(f => ({ ...f, limitAmount: '' }));
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить бюджет?')) return;
    await api.delete(`/budgets/${id}`);
    load();
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Бюджеты</h1>
          <p className="text-xs text-gray-400 mt-0.5">{currentMonth}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Добавить
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Бюджетов нет. Добавьте первый!</div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const over = b.progressPercent >= 100;
            const warn = b.progressPercent >= 80 && !over;
            const barColor = over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-blue-500';

            return (
              <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{b.category.icon}</span>
                    <span className="text-sm font-medium text-gray-800">{b.category.name}</span>
                    {over && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Превышен</span>}
                    {warn && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Почти лимит</span>}
                  </div>
                  <button onClick={() => handleDelete(b.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">
                    ×
                  </button>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className={`h-2 rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(b.progressPercent, 100)}%` }} />
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>Потрачено: <span className="font-medium text-gray-700">{fmt(b.spentAmount)}</span></span>
                  <span>Лимит: <span className="font-medium text-gray-700">{fmt(b.limitAmount)}</span></span>
                </div>
                {b.remainingAmount > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Осталось: {fmt(b.remainingAmount)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Новый бюджет</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input type="number" placeholder="Лимит (₽)" required min="1"
                value={form.limitAmount} onChange={e => setForm(f => ({ ...f, limitAmount: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
                  Отмена
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
