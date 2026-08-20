"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          setError(error.message);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        setLoading(false);
        // redirect to home after signout
        router.push("/");
      }
    })();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-3 py-6 sm:px-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-2xl font-semibold sm:text-xl">Logging out…</h2>
        {error && <div className="mb-3 text-base text-red-600 sm:text-sm">{error}</div>}
        {!error && loading && <div className="text-base text-zinc-600 sm:text-sm">Signing out...</div>}
      </div>
    </main>
  );
}
