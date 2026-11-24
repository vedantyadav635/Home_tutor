"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar, TutorRow } from "@/components/tutor";
import { fieldError, sendJson, type ApiFailure } from "@/lib/client-api";
import type { AvailabilityGrid } from "@/lib/mappers";
import { BOARDS, CLASS_BANDS, DAYS, LANGUAGES, MODES, SUBJECTS, TIME_SLOTS } from "@/lib/options";
import styles from "./builder.module.css";

type Own = {
  slug: string; status: string; fullName: string; qualification: string | null; yearsExperience: number | null;
  phone: string | null; city: string | null; area: string | null; travelRange: string | null;
  subjects: string[]; classBands: string[]; boards: string[]; modes: string[]; languages: string[];
  bio: string | null; methodology: string | null; feeText: string | null; photoUrl: string | null; verified: boolean;
  experience: { period: string | null; title: string; details: string | null }[]; education: string[];
  availability: AvailabilityGrid; reviewNote: string | null;
};

const STEPS = ["Basic details", "Subjects & classes", "Experience", "Timings & fees"] as const;
// Which step holds each field, to send people to the right place when something is missing.
const FIELD_STEP: Record<string, number> = {
  fullName: 0, qualification: 0, yearsExperience: 0, phone: 0, city: 0, area: 0,
  subjects: 1, classBands: 1, boards: 1, modes: 1, languages: 1,
  bio: 2, methodology: 2, experience: 2, education: 2,
  availability: 3, fee: 3, travelRange: 3,
};
const LABEL: Record<string, string> = {
  fullName: "Full name", qualification: "Qualification", phone: "Mobile number", city: "City", area: "Area",
  subjects: "Subjects", classBands: "Classes", modes: "Teaching mode", languages: "Language", bio: "Short introduction",
  availability: "Timings", fee: "Fees",
};

const emptyGrid = () => Object.fromEntries(DAYS.map((d) => [d, Object.fromEntries(TIME_SLOTS.map((s) => [s, false]))])) as AvailabilityGrid;

export function ProfileBuilder({ initial, account }: { initial: Own | null; account: { fullName: string; phone: string } }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState<Own | null>(initial);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [busy, setBusy] = useState<"save" | "submit" | "photo" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [f, setF] = useState(() => ({
    fullName: initial?.fullName ?? account.fullName,
    qualification: initial?.qualification ?? "",
    yearsExperience: initial?.yearsExperience?.toString() ?? "",
    phone: initial?.phone ?? account.phone,
    city: initial?.city ?? "Pune",
    area: initial?.area ?? "",
    subjects: initial?.subjects ?? [],
    classBands: initial?.classBands ?? [],
    boards: initial?.boards ?? [],
    modes: initial?.modes ?? [],
    languages: initial?.languages ?? [],
    bio: initial?.bio ?? "",
    methodology: initial?.methodology ?? "",
    experience: (initial?.experience ?? []).map((e) => [e.period, e.title, e.details].filter(Boolean).join(" · ")).join("\n"),
    education: (initial?.education ?? []).join("\n"),
    availability: initial?.availability ?? emptyGrid(),
    fee: initial?.feeText ?? "",
    travelRange: initial?.travelRange ?? "",
  }));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const toggle = (k: "subjects" | "classBands" | "boards" | "modes" | "languages", v: string) =>
    set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);

  const stepBody = (i: number) =>
    [
      { fullName: f.fullName, qualification: f.qualification, yearsExperience: f.yearsExperience, phone: f.phone, city: f.city, area: f.area },
      { subjects: f.subjects, classBands: f.classBands, boards: f.boards, modes: f.modes, languages: f.languages },
      { bio: f.bio, methodology: f.methodology, experience: f.experience, education: f.education },
      { availability: f.availability, fee: f.fee, travelRange: f.travelRange },
    ][i];

  async function save(next: number | "submit") {
    setError(null);
    setFlash(null);
    setBusy(next === "submit" ? "submit" : "save");
    const res = await sendJson<Own>("/api/me/tutor-profile", stepBody(step), "PUT");
    if (!res.ok) { setBusy(null); return setError(res.error); }
    setSaved(res.data);

    if (next === "submit") {
      const sub = await sendJson<Own>("/api/me/tutor-profile/submit");
      setBusy(null);
      if (!sub.ok) {
        setError(sub.error);
        const firstMissing = Object.keys(sub.error.fields ?? {})[0];
        if (firstMissing && FIELD_STEP[firstMissing] !== undefined) setStep(FIELD_STEP[firstMissing]);
        return;
      }
      router.push("/dashboard/tutor");
      router.refresh();
      return;
    }
    setBusy(null);
    setFlash("Saved");
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const fileInput = useRef<HTMLInputElement>(null);
  async function uploadPhoto(file: File) {
    setError(null);
    if (file.size > 2 * 1024 * 1024) return setError({ code: "too_large", message: "Photos can be at most 2 MB.", fields: { photo: ["Photos can be at most 2 MB."] } });
    setBusy("photo");
    const body = new FormData();
    body.append("photo", file);
    const res = await fetch("/api/me/tutor-profile/photo", { method: "POST", body });
    const json = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) return setError(json?.error ?? { code: "upload_failed", message: "We couldn't upload that photo." });
    setSaved((s) => (s ? { ...s, photoUrl: json.photoUrl } : s));
  }

  const err = (n: string) => fieldError(error, n);
  const missing = error?.code === "incomplete" ? Object.keys(error.fields ?? {}) : [];
  const preview = {
    id: "preview", slug: saved?.slug ?? "", fullName: f.fullName || "Your name", qualification: f.qualification || null,
    yearsExperience: f.yearsExperience ? Number(f.yearsExperience) : null, city: f.city || null, area: f.area || null,
    subjects: f.subjects, classBands: f.classBands, modes: f.modes, languages: f.languages, bio: f.bio || null,
    feeText: f.fee || null, photoUrl: saved?.photoUrl ?? null, verified: saved?.verified ?? false,
  };
  const free = DAYS.reduce((n, d) => n + TIME_SLOTS.filter((s) => f.availability[d][s]).length, 0);

  return (
    <div className={`wrap ${styles.page}`}>
      <Link href="/dashboard/tutor" className={styles.back}>Dashboard</Link>
      <header className={styles.head}>
        <h1>{saved ? "Your tutor profile" : "Create your tutor profile"}</h1>
        {saved && <span className={`pill pill-${saved.status}`}>{saved.status[0].toUpperCase() + saved.status.slice(1)}</span>}
      </header>

      <ol className={styles.steps}>
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined} disabled={!saved && i > 0}
              className={missing.some((m) => FIELD_STEP[m] === i) ? styles.stepMissing : undefined}>
              <span className={styles.stepNum}>{i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      <div className={styles.layout}>
        <form className={styles.form} noValidate onSubmit={(e) => { e.preventDefault(); save(step < 3 ? step + 1 : step); }}>
          {missing.length > 0 && (
            <p className="form-error" role="alert">Before you submit, add: {missing.map((m) => LABEL[m] ?? m).join(", ")}.</p>
          )}

          {step === 0 && (
            <>
              <div className={styles.row}>
                <Field label="Full name" error={err("fullName")}>
                  <input className="input" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" />
                </Field>
                <Field label="Highest qualification" error={err("qualification")}>
                  <input className="input" value={f.qualification} onChange={(e) => set("qualification", e.target.value)} placeholder="e.g. M.Sc. Chemistry, B.Ed." />
                </Field>
              </div>
              <div className={styles.row}>
                <Field label="Years of teaching" error={err("yearsExperience")}>
                  <input className="input" type="number" min={0} max={60} inputMode="numeric" value={f.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} />
                </Field>
                <Field label="Mobile number" error={err("phone")} hint="Parents see it only after you accept their request.">
                  <input className="input" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98765 43210" autoComplete="tel" />
                </Field>
              </div>
              <div className={styles.row}>
                <Field label="City" error={err("city")}>
                  <input className="input" value={f.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label="Area or locality" error={err("area")}>
                  <input className="input" value={f.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Kothrud" />
                </Field>
              </div>
              <div className={styles.photo}>
                <Avatar name={f.fullName || "?"} photoUrl={saved?.photoUrl ?? null} size={72} />
                <div>
                  <p className={styles.label}>Profile photo</p>
                  <p className={styles.hint}>{saved ? "A clear face photo. JPEG, PNG or WebP, up to 2 MB." : "Save this step first, then add a photo."}</p>
                  {err("photo") && <p className="field-error">{err("photo")}</p>}
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                  <button type="button" className="btn btn-quiet btn-sm" disabled={!saved || busy === "photo"} onClick={() => fileInput.current?.click()}>
                    {busy === "photo" ? "Uploading…" : saved?.photoUrl ? "Change photo" : "Upload photo"}
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Chips label="Subjects you teach" values={SUBJECTS} selected={f.subjects} onToggle={(v) => toggle("subjects", v)} error={err("subjects")} />
              <Chips label="Classes" values={CLASS_BANDS.map((b) => b.value)} labels={Object.fromEntries(CLASS_BANDS.map((b) => [b.value, b.label]))} selected={f.classBands} onToggle={(v) => toggle("classBands", v)} error={err("classBands")} />
              <Chips label="Boards and exams" values={BOARDS} selected={f.boards} onToggle={(v) => toggle("boards", v)} error={err("boards")} />
              <Chips label="Teaching mode" values={MODES} selected={f.modes} onToggle={(v) => toggle("modes", v)} error={err("modes")} />
              <Chips label="Language or medium" values={LANGUAGES} selected={f.languages} onToggle={(v) => toggle("languages", v)} error={err("languages")} />
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Short introduction" error={err("bio")} hint={`Shown on your search card. ${300 - f.bio.length} characters left.`}>
                <textarea className="input" rows={3} maxLength={300} value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Two or three lines parents will read first" />
              </Field>
              <Field label="How you teach" error={err("methodology")}>
                <textarea className="input" rows={4} maxLength={2000} value={f.methodology} onChange={(e) => set("methodology", e.target.value)} placeholder="e.g. concept first, then practice, then a weekly test" />
              </Field>
              <Field label="Past teaching experience" error={err("experience")} hint="One job per line: years · role · what you achieved. For example: 2019–now · Home tutor · 60 students, 14 scored 90%+">
                <textarea className="input" rows={4} value={f.experience} onChange={(e) => set("experience", e.target.value)} />
              </Field>
              <Field label="Education and achievements" error={err("education")} hint="One per line.">
                <textarea className="input" rows={3} value={f.education} onChange={(e) => set("education", e.target.value)} placeholder="M.Sc. Chemistry, Pune University" />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <div className="field">
                <span>When are you free to teach?</span>
                <small>Click the slots. {free ? `${free} ${free === 1 ? "slot" : "slots"} chosen.` : "None chosen yet."}</small>
                {err("availability") && <span className="field-error">{err("availability")}</span>}
                <SlotPicker grid={f.availability} onChange={(g) => set("availability", g)} />
              </div>
              <div className={styles.row}>
                <Field label="Fees" error={err("fee")} hint="Write it as parents should read it.">
                  <input className="input" value={f.fee} onChange={(e) => set("fee", e.target.value)} placeholder="₹4,000 / month or ₹500 / hour" />
                </Field>
                <Field label="How far can you travel?" error={err("travelRange")}>
                  <input className="input" value={f.travelRange} onChange={(e) => set("travelRange", e.target.value)} placeholder="e.g. Up to 5 km from Kothrud" />
                </Field>
              </div>
            </>
          )}

          {error && !error.fields && <p className="form-error" role="alert">{error.message}</p>}

          <div className={styles.nav}>
            <button type="button" className="btn btn-quiet" onClick={() => setStep(step - 1)} disabled={step === 0}>Back</button>
            <span className={styles.flash} aria-live="polite">{flash}</span>
            {step < 3 ? (
              <button className="btn btn-primary" disabled={busy !== null}>{busy === "save" ? "Saving…" : `Save and continue`}</button>
            ) : (
              <div className={styles.navEnd}>
                <button className="btn btn-quiet" disabled={busy !== null}>{busy === "save" ? "Saving…" : "Save"}</button>
                {saved?.status !== "approved" && saved?.status !== "pending" && (
                  <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => save("submit")}>
                    {busy === "submit" ? "Submitting…" : "Save and submit for review"}
                  </button>
                )}
              </div>
            )}
          </div>
        </form>

        <aside className={styles.preview} aria-label="Preview">
          <p className={styles.label}>How parents see you in search</p>
          <ul className={styles.previewCard}><TutorRow t={preview} /></ul>
          {saved?.reviewNote && saved.status === "rejected" && (
            <p className="form-error"><strong>Note from our team:</strong> {saved.reviewNote}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <small>{hint}</small>}
    </label>
  );
}

function Chips({ label, values, labels, selected, onToggle, error }: {
  label: string; values: readonly string[]; labels?: Record<string, string>; selected: string[]; onToggle: (v: string) => void; error?: string;
}) {
  return (
    <fieldset className={styles.group}>
      <legend>{label}</legend>
      <div className="chips">
        {values.map((v) => (
          <label key={v} className="chip">
            <input type="checkbox" checked={selected.includes(v)} onChange={() => onToggle(v)} />
            <span>{labels?.[v] ?? v}</span>
          </label>
        ))}
      </div>
      {error && <p className="field-error" style={{ marginTop: "0.4rem" }}>{error}</p>}
    </fieldset>
  );
}

const SLOT = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const;

/** Click-to-toggle weekly timetable, with a few quick presets. */
function SlotPicker({ grid, onChange }: { grid: AvailabilityGrid; onChange: (g: AvailabilityGrid) => void }) {
  const flip = (d: (typeof DAYS)[number], s: (typeof TIME_SLOTS)[number]) => onChange({ ...grid, [d]: { ...grid[d], [s]: !grid[d][s] } });
  const preset = (fn: (d: string, s: string) => boolean) =>
    onChange(Object.fromEntries(DAYS.map((d) => [d, Object.fromEntries(TIME_SLOTS.map((s) => [s, fn(d, s)]))])) as AvailabilityGrid);
  const weekend = (d: string) => d === "Sat" || d === "Sun";
  return (
    <div className={styles.slots}>
      <div className={styles.presets}>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => preset((d, s) => !weekend(d) && s === "evening")}>Weekday evenings</button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => preset((d) => weekend(d))}>Weekends</button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => preset(() => false)}>Clear</button>
      </div>
      <table className={styles.slotTable}>
        <thead>
          <tr><th scope="col"><span className="visually-hidden">Time</span></th>{DAYS.map((d) => <th key={d} scope="col">{d}</th>)}</tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((s) => (
            <tr key={s}>
              <th scope="row">{SLOT[s]}</th>
              {DAYS.map((d) => (
                <td key={d}>
                  <button type="button" aria-pressed={grid[d][s]} aria-label={`${d} ${s}`} onClick={() => flip(d, s)} className={styles.slot} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
