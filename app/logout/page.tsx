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
      } catch (err: any) {
        setError(err?.message ?? "Unexpected error");
      } finally {
        setLoading(false);
        // redirect to home after signout
        router.push("/");
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">Logging out…</h2>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        {!error && loading && <div className="text-sm text-zinc-600">Signing out...</div>}
      </div>
    </div>
  );
}
