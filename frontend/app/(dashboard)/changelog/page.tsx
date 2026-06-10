'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface LogEntry {
  id: string;
  entityType: 'Transaction' | 'Budget';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  before: any;
  after: any;
  changedAt: string;
}

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Создано',  color: 'bg-green-100 text-green-700' },
  UPDATE: { label: 'Изменено', color: 'bg-blue-100 text-blue-700'   },
  DELETE: { label: 'Удалено',  color: 'bg-red-100 text-red-600'     },
};

export default function ChangelogPage() {
  const [entries, setEntries]         = useState<LogEntry[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [entityType, setEntityType]   = useState('');
  const [action, setAction]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<string | null>(null);

  const PER_PAGE = 20;

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
    if (entityType) params.set('entityType', entityType);
    if (action)     params.set('action', action);
    const { data } = await api.get(`/changelog?${params}`);
    setEntries(data.data);
    setTotal(data.pagination.total);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page, entityType, action]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Лог изменений</h1>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        <select value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Все сущности</option>
          <option value="Transaction">Транзакции</option>
          <option value="Budget">Бюджеты</option>
        </select>
        <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Все действия</option>
          <option value="CREATE">Создание</option>
          <option value="UPDATE">Изменение</option>
          <option value="DELETE">Удаление</option>
        </select>
        <span className="text-xs text-gray-400 self-center ml-1">{total} записей</span>
      </div>

      {/* Список */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Загрузка...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Записей нет</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {entries.map((entry) => {
              const badge = ACTION_LABEL[entry.action];
              const isOpen = expanded === entry.id;
              return (
                <li key={entry.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : entry.id)}>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-sm text-gray-600 shrink-0">{entry.entityType}</span>
                    <span className="text-xs text-gray-400 font-mono truncate flex-1">{entry.entityId}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(entry.changedAt).toLocaleString('ru-RU')}
                    </span>
                    <span className="text-gray-300 text-xs">{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {isOpen && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entry.before && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">До</p>
                          <pre className="text-xs bg-gray-50 rounded-lg p-2 overflow-auto max-h-40 text-gray-600">
                            {JSON.stringify(entry.before, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.after && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">После</p>
                          <pre className="text-xs bg-gray-50 rounded-lg p-2 overflow-auto max-h-40 text-gray-600">
                            {JSON.stringify(entry.after, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
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
    </div>
  );
}
