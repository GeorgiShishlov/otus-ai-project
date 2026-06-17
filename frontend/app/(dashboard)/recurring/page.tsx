'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface RecurringRule {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string | null;
  dayOfMonth: number;
  isActive: boolean;
  nextRunDate: string;
  category: { name: string; icon: string };
}

export default function RecurringPage() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [form, setForm] = useState({
    categoryId: '', amount: '', type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    description: '', dayOfMonth: '1',
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/recurring');
    setRules(data);
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
      await api.post('/recurring', { ...form, amount: parseFloat(form.amount), dayOfMonth: parseInt(form.dayOfMonth) });
      setShowForm(false);
      setForm(f => ({ ...f, amount: '', description: '' }));
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(rule: RecurringRule) {
    await api.put(`/recurring/${rule.id}`, { isActive: !rule.isActive });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить правило?')) return;
    await api.delete(`/recurring/${id}`);
    load();
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Повторяющиеся</h1>
          <p className="text-xs text-gray-400 mt-0.5">Автоматические транзакции по расписанию</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Добавить
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Нет правил. Добавьте зарплату или подписки!</div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id}
              className={`bg-white rounded-xl p-4 shadow-sm border transition-colors ${rule.isActive ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{rule.category.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {rule.description || rule.category.name}
                    </p>
                    {!rule.isActive && (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Пауза</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {rule.category.name} · каждый {rule.dayOfMonth}-й · следующий: {new Date(rule.nextRunDate).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${rule.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                  {rule.type === 'INCOME' ? '+' : '−'}{fmt(rule.amount)}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleToggle(rule)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    rule.isActive
                      ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                      : 'border-green-200 text-green-600 hover:bg-green-50'
                  }`}>
                  {rule.isActive ? '⏸ Пауза' : '▶ Возобновить'}
                </button>
                <button onClick={() => handleDelete(rule.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-red-100 text-red-400 hover:bg-red-50 transition-colors">
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Новое правило</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="flex gap-2">
                {(['EXPENSE', 'INCOME'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      form.type === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {t === 'INCOME' ? 'Доход' : 'Расход'}
                  </button>
                ))}
              </div>
              <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input type="number" placeholder="Сумма" required min="0.01" step="0.01"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Описание (Netflix, Зарплата...)"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">День месяца (1–28)</label>
                <input type="number" min="1" max="28" required
                  value={form.dayOfMonth} onChange={e => setForm(f => ({ ...f, dayOfMonth: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
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
