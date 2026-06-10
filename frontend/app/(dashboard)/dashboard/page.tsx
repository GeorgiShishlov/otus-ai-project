'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '@/lib/api';

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

interface Summary  { totalIncome: number; totalExpense: number; balance: number; month: string; }
interface LinePoint { month: string; income: number; expense: number; }
interface PiePoint  { name: string; amount: number; icon: string; color: string; }
interface Top5Item  { name: string; icon: string; color: string; amount: number; }

export default function DashboardPage() {
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [lineData, setLineData] = useState<LinePoint[]>([]);
  const [pieData, setPieData]   = useState<PiePoint[]>([]);
  const [top5, setTop5]         = useState<Top5Item[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(({ data }) => {
      setSummary(data.summary);
      setLineData(data.lineChart);
      setPieData(data.pieChart);
      setTop5(data.top5 ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Загрузка...</div>;

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Дашборд</h1>

      {/* Карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Доходы (месяц)</p>
          <p className="text-2xl font-bold text-green-600">{fmt(summary?.totalIncome ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Расходы (месяц)</p>
          <p className="text-2xl font-bold text-red-500">{fmt(summary?.totalExpense ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Баланс</p>
          <p className={`text-2xl font-bold ${(summary?.balance ?? 0) >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {fmt(summary?.balance ?? 0)}
          </p>
        </div>
      </div>

      {/* Линейный график */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-semibold text-gray-700 mb-4">Доходы и расходы по месяцам</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={lineData}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => (typeof v === 'number' ? fmt(v) : String(v))} />
            <Line type="monotone" dataKey="income"  stroke="#22c55e" strokeWidth={2} dot={false} name="Доходы" />
            <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name="Расходы" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Круговая диаграмма + Топ-5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pieData.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-4">Расходы по категориям</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={false}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {top5.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-4">Топ-5 категорий расходов</p>
            <ul className="space-y-3">
              {top5.map((item, i) => {
                const max = top5[0].amount;
                const pct = Math.round((item.amount / max) * 100);
                return (
                  <li key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">
                        <span className="mr-1">{item.icon}</span>{item.name}
                      </span>
                      <span className="text-sm font-medium text-gray-800">{fmt(item.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
