import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <main className="w-full max-w-5xl py-16 sm:py-20">
        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] items-center">
          <section className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
            <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-violet-700 shadow-sm backdrop-blur-md border border-white/60">
              🎁 Social Wishlist · делитесь списками желаний
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-slate-900">
              Собирайте подарки вместе
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-pink-500">
                — без спойлеров для именинника
              </span>
            </h1>
            <p className="max-w-xl text-sm sm:text-base text-slate-700">
              Создавайте вишлисты под любой повод, делитесь ссылкой с друзьями,
              давайте им резервировать подарки и скидываться на дорогие позиции
              с живым прогресс-баром.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40 hover:from-violet-600 hover:to-pink-600 transition-all"
              >
                Создать вишлист
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/70 px-6 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-white hover:shadow-md backdrop-blur-md transition-all"
              >
                Войти в аккаунт
              </Link>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
              <li>· Публичная ссылка для друзей — без регистрации для гостей</li>
              <li>· Резервы и скидывания с realtime‑обновлением</li>
              <li>· Владелец не видит имена и суммы, сюрприз остаётся сюрпризом</li>
            </ul>
          </section>

          <section className="hidden md:block animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="relative">
              <div className="absolute -inset-10 bg-gradient-to-tr from-violet-400/40 via-pink-400/30 to-sky-300/40 blur-3xl opacity-70" />
              <div className="relative rounded-3xl border border-white/60 bg-white/70 shadow-2xl backdrop-blur-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-violet-700">
                      Пример вишлиста
                    </p>
                    <p className="text-sm font-semibold">
                      День рождения Марии 🎂
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                    Для друзей
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
                    <div>
                      <p className="font-medium">Полароид‑камера</p>
                      <p className="text-[11px] text-slate-500">
                        Зарезервирована гостем
                      </p>
                    </div>
                    <span className="text-[11px] text-violet-700">✓ резерв</span>
                  </div>
                  <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Путешествие в Тбилиси</p>
                      <p className="text-[11px] text-violet-700 font-semibold">
                        7 000 / 10 000 ₽
                      </p>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-violet-100 overflow-hidden">
                      <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-violet-500 to-pink-500" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Гости уже скидываются — вы тоже можете участвовать.
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
                    <div>
                      <p className="font-medium">Курс по иллюстрации</p>
                      <p className="text-[11px] text-slate-500">
                        Отличный вариант, если не хочется материальных подарков
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

