"use client";

import { useMemo, useState } from "react";

const navItems = [
  ["Dashboard", "/"],
  ["Clients", "/clients"],
  ["Programs", "/programs"],
  ["Exercises", "/exercises"],
  ["Workouts", "/workouts"],
  ["Nutrition", "/nutrition"],
  ["Check-ins", "/check-ins"],
  ["Measurements", "/measurements"],
];

export default function ClientsPage() {
  const [query, setQuery] = useState("");

  const clients = useMemo(() => {
    const sample = [
      { name: "No clients yet", detail: "Your client roster will appear here." },
    ];

    if (!query.trim()) return sample;

    return sample.filter((client) =>
      `${client.name} ${client.detail}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  return (
    <main className="min-h-screen bg-[#f6f3ed] text-[#263029]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#d9d2c5] bg-[#173d2a] px-5 py-7 text-white lg:block">
        <div className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d7b98e]">Personal Training</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">Training OS</div>
        </div>
        <nav className="space-y-1">
          {navItems.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className={`block rounded-lg px-3 py-2.5 text-sm transition ${label === "Clients" ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <div className="border-b border-[#d9d2c5] bg-white/70 px-5 py-3 lg:hidden">
          <div className="text-lg font-semibold text-[#173d2a]">Training OS</div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navItems.map(([label, href]) => (
              <a key={label} href={href} className="whitespace-nowrap rounded-full border border-[#d9d2c5] px-3 py-1.5 text-xs">
                {label}
              </a>
            ))}
          </div>
        </div>

        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <header className="mb-8 flex flex-col gap-5 border-b border-[#d9d2c5] pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#9a7b4f]">Client Management</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#173d2a] sm:text-4xl">Clients</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687169]">
                Manage your coaching roster, client profiles, programs, and training history.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg bg-[#173d2a] px-4 py-2.5 text-sm font-medium text-white opacity-50"
              title="Client creation will be enabled with authentication."
            >
              + New Client
            </button>
          </header>

          <section className="rounded-2xl border border-[#d9d2c5] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#173d2a]">Client roster</h2>
                <p className="mt-1 text-sm text-[#7b827d]">Search and manage active clients.</p>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search clients..."
                className="w-full rounded-lg border border-[#d9d2c5] bg-[#faf8f3] px-3 py-2 text-sm outline-none placeholder:text-[#9aa099] focus:border-[#9a7b4f] sm:max-w-xs"
              />
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-[#d9d2c5] bg-[#faf8f3] px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e4eee7] text-[#173d2a]">
                <span className="text-xl">+</span>
              </div>
              <h3 className="mt-4 font-medium text-[#263029]">{clients[0]?.name}</h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#7b827d]">
                {clients[0]?.detail}
              </p>
              <p className="mt-4 text-xs text-[#9a7b4f]">
                Client creation and Supabase data will be connected in the next step.
              </p>
            </div>
          </section>

          <section className="mt-5 grid gap-5 md:grid-cols-3">
            {[
              ["Active Clients", "0", "No client records yet"],
              ["Programs Assigned", "0", "No assignments yet"],
              ["Upcoming Check-ins", "0", "No check-ins scheduled"],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-2xl border border-[#d9d2c5] bg-white p-5 shadow-sm">
                <div className="text-sm font-medium text-[#687169]">{label}</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-[#173d2a]">{value}</div>
                <div className="mt-2 text-xs text-[#8a918b]">{detail}</div>
              </div>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}
