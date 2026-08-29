"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setIsLoggedIn(Boolean(session));
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-4 text-zinc-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 sm:text-sm">
              MIE-COUNTING
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
          </div>

          {!isLoggedIn ? (
            <a
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Login
            </a>
          ) : (
            <a
              href="/logout"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Logout
            </a>
          )}
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">

          {isLoggedIn && (
            <>
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
              <a
                href="/admin/log-pengeluaran"
                className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-4 text-base font-medium text-zinc-800 hover:bg-zinc-100 sm:text-sm"
              >
                Log Pengeluaran
              </a>
              <a
                href="/admin/dashboard-laba-rugi"
                className="flex min-h-12 items-center justify-center rounded-xl border border-emerald-700 bg-emerald-700 px-5 py-4 text-base font-medium text-white hover:bg-emerald-800 sm:text-sm"
              >
                Dashboard Laba Rugi
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
