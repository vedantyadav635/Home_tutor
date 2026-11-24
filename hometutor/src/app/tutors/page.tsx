import type { Metadata } from "next";
import Link from "next/link";
import { TutorRow } from "@/components/tutor";
import type { TutorCard } from "@/lib/mappers";
import { createPublicClient } from "@/lib/supabase/server";
import { readSearch, searchTutors } from "@/lib/tutors";
import { SearchShell } from "./SearchShell";
import styles from "./tutors.module.css";

export const metadata: Metadata = { title: "Find a tutor" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function toParams(raw: Record<string, string | string[] | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) for (const item of [v].flat()) if (item) sp.append(k, item);
  return sp;
}

export default async function TutorsPage({ searchParams }: Props) {
  const sp = toParams(await searchParams);
  const q = readSearch(sp);
  const result = await searchTutors(createPublicClient(), q);
  const tutors: TutorCard[] = result.data?.tutors ?? [];
  const total = result.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / q.pageSize));

  const pageHref = (page: number) => {
    const next = new URLSearchParams(sp);
    if (page > 1) next.set("page", String(page));
    else next.delete("page");
    return `/tutors${next.size ? `?${next}` : ""}`;
  };

  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <h1>Find a tutor</h1>
        <p className={styles.count} aria-live="polite">
          {result.error ? "Search is unavailable right now. Please try again in a minute." : `${total} ${total === 1 ? "tutor" : "tutors"} found`}
        </p>
      </header>

      <SearchShell query={{ ...q, loc: q.loc ?? "" }}>
        {tutors.length > 0 ? (
          <>
            <p className={styles.order}>Verified tutors first, then by years of experience.</p>
            <ul className={styles.list}>{tutors.map((t) => <TutorRow key={t.id} t={t} />)}</ul>
            {pages > 1 && (
              <nav className={styles.pager} aria-label="Pages">
                {q.page > 1 ? <Link className="btn btn-quiet" href={pageHref(q.page - 1)}>Previous</Link> : <span />}
                <span>Page {q.page} of {pages}</span>
                {q.page < pages ? <Link className="btn btn-quiet" href={pageHref(q.page + 1)}>Next</Link> : <span />}
              </nav>
            )}
          </>
        ) : (
          !result.error && (
            <div className={styles.empty}>
              <h2>No tutors match all of these filters</h2>
              <p>Try removing a filter, or search a nearby area. New tutors are added every week.</p>
              <Link href="/tutors" className="btn btn-quiet">Clear all filters</Link>
            </div>
          )
        )}
      </SearchShell>
    </div>
  );
}
