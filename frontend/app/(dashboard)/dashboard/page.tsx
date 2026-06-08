'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '@/lib/api';

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

interface Summary { totalIncome: number; totalExpense: number; balance: number; month: string; }
interface LinePoint { month: string; income: number; expense: number; }
interface PiePoint  { name: string; value: number; }

export default function DashboardPage() {
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [lineData, setLineData] = useState<LinePoint[]>([]);
  const [pieData, setPieData]   = useState<PiePoint[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(({ data }) => {
      setSummary(data.summary);
      setLineData(data.lineChart);
      setPieData(data.pieChart);
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

      {/* Круговая диаграмма */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-4">Расходы по категориям</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
