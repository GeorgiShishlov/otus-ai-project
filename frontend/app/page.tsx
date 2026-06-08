import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="text-xl font-bold text-gray-800">FinanceTracker</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Войти
          </Link>
          <Link href="/register"
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Начать бесплатно
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Контролируйте<br />свои финансы
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-md">
          Отслеживайте доходы и расходы, планируйте бюджет и анализируйте траты — всё в одном месте.
        </p>
        <Link href="/register"
          className="bg-blue-600 text-white px-8 py-3 rounded-xl text-base font-semibold hover:bg-blue-700 transition-colors shadow-md">
          Попробовать бесплатно
        </Link>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 max-w-2xl w-full">
          {[
            { icon: '📊', title: 'Аналитика', desc: 'Графики доходов и расходов по месяцам' },
            { icon: '🎯', title: 'Бюджеты', desc: 'Лимиты по категориям с отслеживанием' },
            { icon: '🔄', title: 'Автоплатежи', desc: 'Повторяющиеся транзакции автоматически' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-gray-50 rounded-xl p-5 text-left">
              <span className="text-2xl">{icon}</span>
              <h3 className="font-semibold text-gray-800 mt-2 mb-1">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </main>

    </div>
  );
}
