"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

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
  { title: "Personal Information", description: "Basic information a trainer would collect during an intake.", fields: ["Date of birth / age", "Occupation", "Typical daily activity", "Preferred training schedule", "Emergency contact"] },
  { title: "Goals & Training History", description: "Understand what the client wants and what they have done before.", fields: ["Primary goal", "Secondary goals", "Training experience", "Previous programs or coaches", "Sports and recreational activities", "Training preferences"] },
  { title: "Health & Medical Screening", description: "Record relevant health information and screening considerations.", fields: ["Medical conditions", "Current medications", "Previous surgeries", "Physician or medical clearance", "PAR-Q style screening", "Relevant health history"] },
  { title: "Injuries, Pain & Limitations", description: "Document anything that may affect exercise selection or training.", fields: ["Current injuries", "Previous injuries", "Current pain or discomfort", "Pain triggers", "Exercises to avoid", "Exercises requiring modification", "Mobility restrictions"] },
  { title: "Movement & Posture Evaluation", description: "Capture movement observations and left/right differences.", fields: ["Static posture", "Squat assessment", "Hip hinge assessment", "Lunge / single-leg assessment", "Push assessment", "Pull assessment", "Overhead movement", "Rotation", "Mobility limitations", "Stability limitations", "Left/right asymmetries"] },
  { title: "Fitness Assessment", description: "Track baseline fitness measures that can be repeated over time.", fields: ["Resting heart rate", "Blood pressure", "Cardio / endurance test", "Strength tests", "Muscular endurance", "Flexibility / mobility", "Balance", "Other fitness tests"] },
  { title: "Body Measurements", description: "Baseline measurements for progress tracking.", fields: ["Height", "Weight", "Body-fat measurement", "Waist", "Hips", "Chest", "Upper arm", "Thigh", "Other measurements"] },
  { title: "Nutrition & Lifestyle", description: "Record lifestyle factors that can affect training and recovery.", fields: ["Typical eating pattern", "Water intake", "Sleep duration / quality", "Stress level", "Alcohol use", "Supplements", "Dietary preferences or restrictions"] },
  { title: "Trainer Notes", description: "Free-form observations and coaching considerations.", fields: ["Initial observations", "Coaching notes", "Client preferences", "Things to remember"] },
  { title: "Initial Evaluation Summary", description: "Turn the evaluation into clear coaching priorities.", fields: ["Strengths", "Areas to improve", "Training priorities", "Initial recommendations", "4–12 week goals", "Follow-up evaluation date"] },
];

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  goal: string | null;
  active: boolean;
  current_weight: number | null;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  heightFeet: string;
  heightInches: string;
  startingWeight: string;
  goal: string;
  trainingExperience: string;
  activityLevel: string;
  notes: string;
};

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  dateOfBirth: "",
  heightFeet: "",
  heightInches: "",
  startingWeight: "",
  goal: "",
  trainingExperience: "",
  activityLevel: "",
  notes: "",
};

export default function ClientsPage() {
  const [query, setQuery] = useState("");
  const [openEvaluation, setOpenEvaluation] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadClients() {
    setLoading(true);
    setMessage("");

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, goal, active, current_weight")
        .order("last_name", { ascending: true });

      if (error) throw error;
      setClients(data ?? []);
    } catch (error) {
      console.error(error);
      setMessage("We couldn't load the client roster. Check the Supabase table and permissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clients;

    return clients.filter((client) =>
      `${client.first_name} ${client.last_name} ${client.goal ?? ""}`.toLowerCase().includes(normalized)
    );
  }, [clients, query]);

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setMessage("First name and last name are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("clients").insert({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        date_of_birth: form.dateOfBirth || null,
        height_inches: form.heightFeet || form.heightInches ? (Number(form.heightFeet || 0) * 12 + Number(form.heightInches || 0)) : null,
        starting_weight: form.startingWeight ? Number(form.startingWeight) : null,
        current_weight: form.startingWeight ? Number(form.startingWeight) : null,
        goal: form.goal.trim() || null,
        training_experience: form.trainingExperience.trim() || null,
        activity_level: form.activityLevel.trim() || null,
        notes: form.notes.trim() || null,
        active: true,
      });

      if (error) throw error;

      setForm(emptyForm);
      setFormOpen(false);
      setMessage("Client created successfully.");
      await loadClients();
    } catch (error) {
      console.error(error);
      const details = error instanceof Error ? error.message : String(error);
      setMessage(`Client creation failed: ${details}`);
    } finally {
      setSaving(false);
    }
  }

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
            <button type="button" onClick={() => { setFormOpen(true); setMessage(""); }} className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90">
              + New Client
            </button>
          </header>

          {message && (
            <div className="mb-5 rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white/70">
              {message}
            </div>
          )}

          {formOpen && (
            <section className="mb-5 rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">New client</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Create client profile</h2>
                </div>
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5">Cancel</button>
              </div>

              <form onSubmit={createClient} className="mt-5 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-white">Basic information</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["firstName", "First name", "text"],
                      ["lastName", "Last name", "text"],
                      ["email", "Email", "email"],
                      ["dateOfBirth", "Date of birth", "date"],
                    ].map(([key, label, type]) => (
                      <label key={key} className="text-xs text-white/50">
                        {label}
                        <input
                          type={type}
                          value={form[key as keyof FormState]}
                          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                          className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white"
                        />
                      </label>
                    ))}
                    <div className="text-xs text-white/50">
                      Height
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="0"
                          max="8"
                          value={form.heightFeet}
                          onChange={(event) => setForm({ ...form, heightFeet: event.target.value })}
                          placeholder="ft"
                          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white"
                        />
                        <input
                          type="number"
                          min="0"
                          max="11"
                          value={form.heightInches}
                          onChange={(event) => setForm({ ...form, heightInches: event.target.value })}
                          placeholder="in"
                          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-white">Training information</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ["startingWeight", "Starting weight (lb)"],
                      ["goal", "Primary goal"],
                      ["trainingExperience", "Training experience"],
                      ["activityLevel", "Activity level"],
                    ].map(([key, label]) => (
                      <label key={key} className="text-xs text-white/50">
                        {label}
                        <input
                          type={key === "startingWeight" ? "number" : "text"}
                          value={form[key as keyof FormState]}
                          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                          className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-white"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <label className="block text-xs text-white/50">
                  Trainer notes
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-white"
                  />
                </label>

                <div className="flex justify-end">
                  <button type="submit" disabled={saving} className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40">
                    {saving ? "Creating..." : "Create Client"}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Client roster</h2>
                <p className="mt-1 text-sm text-white/50">{loading ? "Loading clients..." : `${clients.length} client${clients.length === 1 ? "" : "s"} in your roster.`}</p>
              </div>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients..." className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white sm:max-w-xs" />
            </div>

            <div className="mt-5">
              {loading ? (
                <div className="rounded-xl border border-dashed border-white/15 bg-black px-6 py-12 text-center text-sm text-white/40">Loading client roster...</div>
              ) : filteredClients.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 bg-black px-6 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-black"><span className="text-xl">+</span></div>
                  <h3 className="mt-4 font-medium text-white">{query ? "No matching clients" : "No clients yet"}</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-white/50">{query ? "Try a different search." : "Create your first client to start building their training profile."}</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
                  {filteredClients.map((client) => (
                    <a key={client.id} href={`/clients/${client.id}`} className="flex items-center justify-between gap-4 bg-black px-4 py-4 transition hover:bg-white/5">
                      <div>
                        <div className="font-medium text-white">{client.first_name} {client.last_name}</div>
                        <div className="mt-1 text-xs text-white/40">{client.goal || "Goal not set"}{client.current_weight ? ` • ${client.current_weight} lb` : ""}</div>
                      </div>
                      <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">{client.active ? "Active" : "Inactive"}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Evaluation framework</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Client evaluation</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">A structured intake and assessment framework for the information a personal trainer would normally review. Sections stay collapsed until you open them.</p>
            </div>

            <div className="mt-5 space-y-2">
              {evaluationSections.map((section) => {
                const isOpen = openEvaluation === section.title;
                return (
                  <div key={section.title} className="overflow-hidden rounded-xl border border-white/10 bg-black">
                    <button type="button" onClick={() => setOpenEvaluation(isOpen ? null : section.title)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-white/5" aria-expanded={isOpen}>
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
                            <div key={field} className="rounded-lg border border-white/10 bg-[#111111] px-3 py-3 text-sm text-white/70">{field}</div>
                          ))}
                        </div>
                        <p className="mt-4 text-xs text-white/30">These fields will become editable client-specific evaluation data when the client profile is implemented.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-5 grid gap-5 md:grid-cols-3">
            {[
              ["Active Clients", String(clients.filter((client) => client.active).length), "Currently active"],
              ["Programs Assigned", "0", "Program assignments will come next"],
              ["Upcoming Check-ins", "0", "Check-ins will come next"],
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
