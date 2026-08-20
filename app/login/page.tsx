"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // signed in
      // redirect to home or dashboard
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-3 py-6 sm:px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 className="mb-4 text-2xl font-semibold sm:text-xl">Login</h2>

        <label className="mb-2 block text-base font-medium sm:text-sm">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 min-h-12 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base"
          required
        />

        <label className="mb-2 block text-base font-medium sm:text-sm">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 min-h-12 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base"
          required
        />

        {error && <div className="mb-3 text-base text-red-600 sm:text-sm">{error}</div>}

        <button
          type="submit"
          className="min-h-12 w-full rounded-lg bg-foreground px-4 py-2 text-base font-medium text-white sm:text-sm"
          disabled={loading}
        >
          {loading ? "Logging in…" : "Login"}
        </button>

        <p className="mt-4 text-base text-zinc-600 sm:text-sm">Use the Owner user you created in Supabase Auth</p>
      </form>
    </main>
  );
}
