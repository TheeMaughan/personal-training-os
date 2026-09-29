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

const evaluationSections = [
  {
    title: "Personal Information",
    description: "Basic information a trainer would collect during an intake.",
    fields: ["Date of birth / age", "Occupation", "Typical daily activity", "Preferred training schedule", "Emergency contact"],
  },
  {
    title: "Goals & Training History",
    description: "Understand what the client wants and what they have done before.",
    fields: ["Primary goal", "Secondary goals", "Training experience", "Previous programs or coaches", "Sports and recreational activities", "Training preferences"],
  },
  {
    title: "Health & Medical Screening",
    description: "Record relevant health information and screening considerations.",
    fields: ["Medical conditions", "Current medications", "Previous surgeries", "Physician or medical clearance", "PAR-Q style screening", "Relevant health history"],
  },
  {
    title: "Injuries, Pain & Limitations",
    description: "Document anything that may affect exercise selection or training.",
    fields: ["Current injuries", "Previous injuries", "Current pain or discomfort", "Pain triggers", "Exercises to avoid", "Exercises requiring modification", "Mobility restrictions"],
  },
  {
    title: "Movement & Posture Evaluation",
    description: "Capture movement observations and left/right differences.",
    fields: ["Static posture", "Squat assessment", "Hip hinge assessment", "Lunge / single-leg assessment", "Push assessment", "Pull assessment", "Overhead movement", "Rotation", "Mobility limitations", "Stability limitations", "Left/right asymmetries"],
  },
  {
    title: "Fitness Assessment",
    description: "Track baseline fitness measures that can be repeated over time.",
    fields: ["Resting heart rate", "Blood pressure", "Cardio / endurance test", "Strength tests", "Muscular endurance", "Flexibility / mobility", "Balance", "Other fitness tests"],
  },
  {
    title: "Body Measurements",
    description: "Baseline measurements for progress tracking.",
    fields: ["Height", "Weight", "Body-fat measurement", "Waist", "Hips", "Chest", "Upper arm", "Thigh", "Other measurements"],
  },
  {
    title: "Nutrition & Lifestyle",
    description: "Record lifestyle factors that can affect training and recovery.",
    fields: ["Typical eating pattern", "Water intake", "Sleep duration / quality", "Stress level", "Alcohol use", "Supplements", "Dietary preferences or restrictions"],
  },
  {
    title: "Trainer Notes",
    description: "Free-form observations and coaching considerations.",
    fields: ["Initial observations", "Coaching notes", "Client preferences", "Things to remember"],
  },
  {
    title: "Initial Evaluation Summary",
    description: "Turn the evaluation into clear coaching priorities.",
    fields: ["Strengths", "Areas to improve", "Training priorities", "Initial recommendations", "4–12 week goals", "Follow-up evaluation date"],
  },
];

export default function ClientsPage() {
  const [query, setQuery] = useState("");
  const [openEvaluation, setOpenEvaluation] = useState<string | null>(null);

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
    <main className="min-h-screen bg-black text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-black px-5 py-7 text-white lg:block">
        <div className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">Personal Training</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">Training OS</div>
        </div>
        <nav className="space-y-1">
          {navItems.map(([label, href]) => (
            <a key={label} href={href} className={`block rounded-lg px-3 py-2.5 text-sm transition ${label === "Clients" ? "bg-white text-black" : "text-white/65 hover:bg-white/10 hover:text-white"}`}>
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <div className="border-b border-white/10 bg-black px-5 py-3 lg:hidden">
          <div className="text-lg font-semibold text-white">Training OS</div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navItems.map(([label, href]) => (
              <a key={label} href={href} className="whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80">{label}</a>
            ))}
          </div>
        </div>

        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Client Management</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Clients</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Manage your coaching roster, client profiles, programs, and training history.</p>
            </div>
            <button type="button" disabled className="cursor-not-allowed rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black opacity-40" title="Client creation will be enabled with authentication.">
              + New Client
            </button>
          </header>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Client roster</h2>
                <p className="mt-1 text-sm text-white/50">Search and manage active clients.</p>
              </div>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients..." className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white sm:max-w-xs" />
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-black px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-black"><span className="text-xl">+</span></div>
              <h3 className="mt-4 font-medium text-white">{clients[0]?.name}</h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-white/50">{clients[0]?.detail}</p>
              <p className="mt-4 text-xs text-white/35">Client creation and Supabase data will be connected in the next step.</p>
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Evaluation framework</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Client evaluation</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
                A structured intake and assessment framework for the information a personal trainer would normally review. Sections stay collapsed until you open them.
              </p>
            </div>

            <div className="mt-5 space-y-2">
              {evaluationSections.map((section) => {
                const isOpen = openEvaluation === section.title;

                return (
                  <div key={section.title} className="overflow-hidden rounded-xl border border-white/10 bg-black">
                    <button
                      type="button"
                      onClick={() => setOpenEvaluation(isOpen ? null : section.title)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-white/5"
                      aria-expanded={isOpen}
                    >
                      <div>
                        <div className="font-medium text-white">{section.title}</div>
                        <div className="mt-1 text-xs text-white/40">{section.description}</div>
                      </div>
                      <span className="shrink-0 text-white/50">{isOpen ? "−" : "+"}</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-white/10 px-4 py-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {section.fields.map((field) => (
                            <div key={field} className="rounded-lg border border-white/10 bg-[#111111] px-3 py-3 text-sm text-white/70">
                              {field}
                            </div>
                          ))}
                        </div>
                        <p className="mt-4 text-xs text-white/30">These fields will become editable client-specific evaluation data when the client profile and Supabase connection are implemented.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-5 grid gap-5 md:grid-cols-3">
            {[
              ["Active Clients", "0", "No client records yet"],
              ["Programs Assigned", "0", "No assignments yet"],
              ["Upcoming Check-ins", "0", "No check-ins scheduled"],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-sm">
                <div className="text-sm font-medium text-white/50">{label}</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</div>
                <div className="mt-2 text-xs text-white/30">{detail}</div>
              </div>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}
