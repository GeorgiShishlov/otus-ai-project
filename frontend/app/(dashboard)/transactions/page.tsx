'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Transaction {
  id: string;
  amount: number;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  description: string | null;
  category: { name: string; icon: string; color: string };
}

interface FormData {
  amount: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  categoryId: string;
  description: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [form, setForm] = useState<FormData>({
    amount: '', date: new Date().toISOString().split('T')[0],
    type: 'EXPENSE', categoryId: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  const PER_PAGE = 10;

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
    if (typeFilter) params.set('type', typeFilter);
    const { data } = await api.get(`/transactions?${params}`);
    setTransactions(data.data);
    setTotal(data.pagination.total);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page, typeFilter]);

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
      await api.post('/transactions', {
        ...form,
        amount: parseFloat(form.amount),
        date: new Date(form.date).toISOString(),
      });
      setShowForm(false);
      setForm(f => ({ ...f, amount: '', description: '' }));
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить транзакцию?')) return;
    await api.delete(`/transactions/${id}`);
    load();
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Транзакции</h1>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Добавить
        </button>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2">
        {['', 'INCOME', 'EXPENSE'].map((t) => (
          <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {t === '' ? 'Все' : t === 'INCOME' ? 'Доходы' : 'Расходы'}
          </button>
        ))}
      </div>

      {/* Список */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Загрузка...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Транзакций нет</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                <span className="text-xl mr-3">{tx.category.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {tx.description || tx.category.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {tx.category.name} · {new Date(tx.date).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <span className={`text-sm font-semibold mr-3 ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'INCOME' ? '+' : '−'}{fmt(tx.amount)}
                </span>
                <button onClick={() => handleDelete(tx.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            ←
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            →
          </button>
        </div>
      )}

      {/* Форма добавления */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Новая транзакция</h2>
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
              <input type="number" placeholder="Сумма" required min="0.01" step="0.01"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Описание (необязательно)"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
                  Отмена
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Сохранение...' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
