export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-4 text-zinc-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 sm:text-sm">
          Mie-Counting
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href="/login"
            className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-900 px-5 py-4 text-base font-medium text-white transition hover:bg-zinc-800 sm:text-sm"
          >
            Login
          </a>
          <a
            href="/admin/master-data"
            className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-4 text-base font-medium text-zinc-800 transition hover:bg-zinc-100 sm:text-sm"
          >
            Master Menu
          </a>
          <a
            href="/admin/log-harian"
            className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-4 text-base font-medium text-zinc-800 transition hover:bg-zinc-100 sm:text-sm"
          >
            Input Penjualan &amp; Titipan
          </a>
        </div>
      </div>
    </main>
  );
}
