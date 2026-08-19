export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
          Mie-Counting
        </p>
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href="/login"
            className="rounded-xl border border-zinc-200 bg-zinc-900 px-5 py-4 text-center font-medium text-white transition hover:bg-zinc-800"
          >
            Login
          </a>
          <a
            href="/admin/menu"
            className="rounded-xl border border-zinc-200 bg-white px-5 py-4 text-center font-medium text-zinc-800 transition hover:bg-zinc-100"
          >
            Master Menu
          </a>
        </div>
      </div>
    </main>
  );
}
