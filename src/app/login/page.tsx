"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace("/");
      }
    };

    checkSession();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              Personal Training
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Training OS
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Sign in to your coaching workspace.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Trainer sign in</h2>
              <p className="mt-1 text-sm text-white/45">
                Use your Training OS account credentials.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/75">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-white/75">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-3 text-sm leading-5 text-white/70">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-white/30">
            Your account access and client permissions will be managed through
            Training OS authentication.
          </p>
        </div>
      </div>
    </main>
  );
}
