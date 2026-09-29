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

const stats = [
  ["Active Clients", "0", "No client records yet"],
  ["Workouts Today", "0", "No workouts scheduled"],
  ["Progression Reviews", "0", "Nothing awaiting review"],
  ["Check-ins This Week", "0", "No check-ins recorded"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-black px-5 py-7 text-white lg:block">
        <div className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">Personal Training</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">Training OS</div>
        </div>
        <nav className="space-y-1">
          {navItems.map(([label, href], index) => (
            <a
              key={label}
              href={href}
              className={`block rounded-lg px-3 py-2.5 text-sm transition ${index === 0 ? "bg-white text-black" : "text-white/65 hover:bg-white/10 hover:text-white"}`}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="absolute bottom-7 left-5 right-5 rounded-xl border border-white/10 bg-[#111111] p-4">
          <div className="text-xs uppercase tracking-wider text-white/40">System</div>
          <div className="mt-2 text-sm text-white/80">Supabase connected</div>
          <div className="mt-1 text-xs text-white/40">Training database ready</div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="border-b border-white/10 bg-black px-5 py-3 lg:hidden">
          <div className="text-lg font-semibold text-white">Training OS</div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navItems.map(([label, href]) => (
              <a key={label} href={href} className="whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80">
                {label}
              </a>
            ))}
          </div>
        </div>

        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Trainer Dashboard</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Good morning, Coach</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                Your central workspace for clients, programming, workouts, and coaching decisions.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-sm shadow-sm">
              <div className="font-medium text-white">Trainer account</div>
              <div className="mt-1 text-xs text-white/45">Ready to build your coaching roster</div>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(([label, value, detail]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-sm">
                <div className="text-sm font-medium text-white/50">{label}</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</div>
                <div className="mt-2 text-xs text-white/30">{detail}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Activity</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Recent client activity</h2>
                </div>
                <a href="/clients" className="text-sm font-medium text-white hover:underline">View clients</a>
              </div>
              <div className="mt-6 rounded-xl border border-dashed border-white/15 bg-black px-6 py-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-black">+</div>
                <h3 className="mt-4 font-medium text-white">No client activity yet</h3>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-white/50">
                  Add your first client to start assigning programs, tracking workouts, and building a coaching history.
                </p>
                <a href="/clients" className="mt-5 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-white/90">
                  Add a client
                </a>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white p-6 text-black shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-black/50">Training intelligence</p>
              <h2 className="mt-1 text-xl font-semibold">Built for coaching decisions</h2>
              <p className="mt-3 text-sm leading-6 text-black/60">
                The system will turn completed workout history into progression suggestions for your review, while preserving your ability to approve, modify, or reject every recommendation.
              </p>
              <div className="mt-6 space-y-3">
                {["Exercise library", "Template programs", "Client-specific overrides", "Workout history", "Progression review"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border border-black/10 bg-black/5 px-3 py-2.5 text-sm text-black/75">
                    <span className="h-1.5 w-1.5 rounded-full bg-black" />
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-5 rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Build status</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Database schema", "Built", "Supabase tables are in place."],
                ["Supabase client", "Built", "The app is connected to the project configuration."],
                ["Trainer dashboard", "Built", "Core coaching workspace is now the home page."],
                ["Client management", "Next", "Create clients and trainer-facing client profiles."],
              ].map(([title, status, detail]) => (
                <div key={title} className="rounded-xl border border-white/10 bg-black p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white">{title}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${status === "Built" ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>{status}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/40">{detail}</p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
