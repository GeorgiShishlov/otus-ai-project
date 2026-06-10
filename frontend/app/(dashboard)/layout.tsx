'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Дашборд',    icon: '📊' },
  { href: '/transactions', label: 'Транзакции', icon: '💳' },
  { href: '/categories',   label: 'Категории',  icon: '🏷️' },
  { href: '/budgets',      label: 'Бюджеты',    icon: '🎯' },
  { href: '/recurring',    label: 'Повторы',    icon: '🔄' },
  { href: '/csv',          label: 'CSV',        icon: '📂' },
  { href: '/changelog',    label: 'Лог',        icon: '📋' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    api.get('/auth/me')
      .then(({ data }) => setUserName(data.name))
      .catch(() => router.push('/login'));
  }, [router]);

  function logout() {
    localStorage.removeItem('token');
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Сайдбар (desktop) ───────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 fixed h-full z-10">
        <div className="px-5 py-5 border-b border-gray-100">
          <span className="text-lg font-bold text-blue-600">💰 Финансы</span>
          {userName && <p className="text-xs text-gray-400 mt-1 truncate">{userName}</p>}
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === href
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mx-4 mb-5 text-sm text-gray-400 hover:text-red-500 text-left transition-colors"
        >
          Выйти
        </button>
      </aside>

      {/* ── Основной контент ────────────────────────── */}
      <main className="flex-1 md:ml-56 pb-20 md:pb-0">
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <span className="text-base font-bold text-blue-600">💰 Финансы</span>
          <button onClick={logout} className="text-xs text-gray-400">Выйти</button>
        </header>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* ── Нижняя навигация (mobile) ───────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-20">
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
              pathname === href ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span className="text-lg">{icon}</span>
            <span className="mt-0.5 leading-none">{label}</span>
          </Link>
        ))}
      </nav>

    </div>
  );
}
