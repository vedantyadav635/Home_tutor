"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { BOARDS, CLASS_BANDS, LANGUAGES, MODES, SUBJECTS } from "@/lib/options";
import styles from "./tutors.module.css";

type Query = {
  board: string[]; band: string[]; subject: string[]; mode: string[]; lang: string[];
  minYears: number; loc: string;
};
type ListKey = "board" | "band" | "subject" | "mode" | "lang";

const GROUPS: { name: ListKey; label: string; options: { value: string; label: string }[] }[] = [
  { name: "subject", label: "Subject", options: SUBJECTS.map((v) => ({ value: v, label: v })) },
  { name: "band", label: "Class", options: CLASS_BANDS.map((b) => ({ value: b.value, label: b.label })) },
  { name: "board", label: "Board or exam", options: BOARDS.map((v) => ({ value: v, label: v })) },
  { name: "mode", label: "Teaching mode", options: MODES.map((v) => ({ value: v, label: v })) },
  { name: "lang", label: "Language", options: LANGUAGES.map((v) => ({ value: v, label: v })) },
];

const YEARS = [
  { value: "0", label: "Any" },
  { value: "1", label: "1+ years" },
  { value: "3", label: "3+ years" },
  { value: "5", label: "5+ years" },
];

/** Filters + results. Filters write to the URL; the server renders the results (children). */
export function SearchShell({ query, children }: { query: Query; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [loc, setLoc] = useState(query.loc);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const active =
    query.board.length + query.band.length + query.subject.length + query.mode.length + query.lang.length +
    (query.minYears ? 1 : 0) + (query.loc ? 1 : 0);

  // Keep the checkboxes in step with the URL (back/forward, "Clear all" links).
  const key = JSON.stringify(query);
  useEffect(() => {
    const q: Query = JSON.parse(key);
    for (const el of Array.from(form.current?.elements ?? [])) {
      if (!(el instanceof HTMLInputElement)) continue;
      if (el.type === "checkbox") el.checked = q[el.name as ListKey]?.includes(el.value) ?? false;
      if (el.type === "radio") el.checked = el.value === String(q.minYears);
    }
    if (document.activeElement?.getAttribute("name") !== "loc") setLoc(q.loc);
  }, [key]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function apply() {
    clearTimeout(timer.current);
    const sp = new URLSearchParams();
    for (const [k, v] of new FormData(form.current!)) {
      const value = String(v).trim();
      if (value && !(k === "minYears" && value === "0")) sp.append(k, value);
    }
    start(() => router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  }

  function clearAll() {
    setLoc("");
    for (const el of Array.from(form.current?.elements ?? [])) {
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) el.checked = el.value === "0";
    }
    start(() => router.replace(pathname, { scroll: false }));
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.aside} aria-label="Filters">
        <details className={styles.filterToggle}>
          <summary>Filters{active ? ` (${active})` : ""}</summary>
        </details>
        <form
          ref={form}
          className={styles.filters}
          onChange={(e) => { if (!(e.target instanceof HTMLInputElement && e.target.name === "loc")) apply(); }}
          onSubmit={(e) => { e.preventDefault(); apply(); }}
        >
          <label className="field">
            <span>Area</span>
            <input
              className="input" name="loc" value={loc} placeholder="e.g. Kothrud" autoComplete="off" enterKeyHint="search"
              onChange={(e) => { setLoc(e.target.value); clearTimeout(timer.current); timer.current = setTimeout(apply, 400); }}
            />
          </label>
          {GROUPS.map((g) => (
            <fieldset key={g.name} className={styles.group}>
              <legend>{g.label}</legend>
              <div className="chips">
                {g.options.map((o) => (
                  <label key={o.value} className="chip">
                    <input type="checkbox" name={g.name} value={o.value} defaultChecked={query[g.name].includes(o.value)} />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <fieldset className={styles.group}>
            <legend>Experience</legend>
            <div className="chips">
              {YEARS.map((y) => (
                <label key={y.value} className="chip">
                  <input type="radio" name="minYears" value={y.value} defaultChecked={String(query.minYears) === y.value} />
                  <span>{y.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {active > 0 && <button type="button" className={styles.clear} onClick={clearAll}>Clear all filters</button>}
        </form>
      </aside>
      <section className={styles.results} data-pending={pending || undefined} aria-busy={pending}>
        {children}
      </section>
    </div>
  );
}
