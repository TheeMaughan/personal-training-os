"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkInviteSession = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!data.session) {
          setError("This invitation link is missing or has expired. Please ask your trainer for a new invitation.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to validate invitation.");
      } finally {
        setChecking(false);
      }
    };

    void checkInviteSession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      router.replace("/client");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to set your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Personal Training</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Training OS</h1>
            <p className="mt-2 text-sm text-white/50">Finish setting up your client account.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl sm:p-8">
            <h2 className="text-lg font-semibold">Create your password</h2>
            <p className="mt-1 text-sm leading-6 text-white/45">
              Your trainer has invited you to Training OS. Choose a password to access your client account.
            </p>

            {checking ? (
              <div className="mt-6 rounded-lg border border-white/10 bg-black px-4 py-3 text-sm text-white/50">Checking invitation...</div>
            ) : error && !password ? (
              <div className="mt-6 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm leading-5 text-white/70">{error}</div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-white/75">Password</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-black px-3.5 py-3 text-sm text-white outline-none focus:border-white/40"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-white/75">Confirm password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-black px-3.5 py-3 text-sm text-white outline-none focus:border-white/40"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-3 text-sm leading-5 text-white/70">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Set password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
