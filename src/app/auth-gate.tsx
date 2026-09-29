"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

const publicPaths = ["/login", "/set-password"];

type Role = "trainer" | "client";

export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (publicPaths.includes(pathname)) {
          if (pathname === "/login" && session) {
            const response = await fetch("/api/auth/me", {
              headers: { Authorization: `Bearer ${session.access_token}` },
              cache: "no-store",
            });
            const result = await response.json();
            if (response.ok) {
              router.replace(result.role === "client" ? "/client" : "/");
              return;
            }
          }
          if (active) setReady(true);
          return;
        }

        if (!session) {
          router.replace("/login");
          return;
        }

        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        const role = result.role as Role;
        if (role === "client" && pathname !== "/client" && !pathname.startsWith("/client/")) {
          router.replace("/client");
          return;
        }

        if (role === "trainer" && (pathname === "/client" || pathname.startsWith("/client/"))) {
          router.replace("/");
          return;
        }

        if (active) setReady(true);
      } catch {
        router.replace("/login");
      }
    }

    void checkAccess();
    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Training OS</div>
          <div className="mt-3 text-sm text-white/50">Checking account access...</div>
        </div>
      </main>
    );
  }

  return children;
}
