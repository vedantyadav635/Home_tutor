import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Avatar, bandLabel, Seal, Timetable } from "@/components/tutor";
import { createClient } from "@/lib/supabase/server";
import { tutorBySlug } from "@/lib/tutors";
import { RequestDemo } from "./RequestDemo";
import styles from "./profile.module.css";

type Props = { params: Promise<{ slug: string }> };

// RLS decides visibility (approved for everyone; drafts for their owner and admins), so use the viewer's session.
const load = cache(async (slug: string) => (await tutorBySlug(await createClient(), slug)).data);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await load((await params).slug);
  if (!t) return { title: "Tutor not found" };
  return { title: `${t.fullName}, ${t.subjects.slice(0, 2).join(" and ")} tutor in ${t.area ?? t.city ?? "Pune"}`, description: t.bio ?? undefined };
}

export default async function TutorPage({ params }: Props) {
  const t = await load((await params).slug);
  if (!t) notFound();
  const first = t.fullName.split(" ")[0];
  const place = [t.area, t.city].filter(Boolean).join(", ");

  const facts: [string, string][] = [
    ["Teaches", t.subjects.join(", ")],
    ["Classes", t.classBands.map(bandLabel).join(", ")],
    ["Boards", t.boards.join(", ")],
    ["Mode", t.modes.join(", ")],
    ["Language", t.languages.join(", ")],
    ["Travels", t.travelRange ?? ""],
  ];

  return (
    <article className={`wrap ${styles.page}`}>
      <Link href="/tutors" className={styles.back}>All tutors</Link>

      <header className={styles.head}>
        <Avatar name={t.fullName} photoUrl={t.photoUrl} size={104} />
        <div>
          <h1>{t.fullName}</h1>
          {t.qualification && <p className={styles.qual}>{t.qualification}</p>}
          <p className={styles.meta}>
            {t.verified && <Seal />}
            {place && <span>{place}</span>}
            {t.yearsExperience != null && <span>{t.yearsExperience} {t.yearsExperience === 1 ? "year" : "years"} teaching</span>}
          </p>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.body}>
          <dl className={styles.facts}>
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>

          {t.bio && (
            <section>
              <h2>About</h2>
              <p className={styles.bio}>{t.bio}</p>
            </section>
          )}
          {t.methodology && (
            <section>
              <h2>How {first} teaches</h2>
              <p>{t.methodology}</p>
            </section>
          )}
          {t.experience.length > 0 && (
            <section>
              <h2>Experience</h2>
              <ol className={styles.timeline}>
                {t.experience.map((e, i) => (
                  <li key={i}>
                    <span className={styles.period}>{e.period}</span>
                    <div>
                      <h3>{e.title}</h3>
                      {e.details && <p>{e.details}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {t.education.length > 0 && (
            <section>
              <h2>Education and achievements</h2>
              <ul className={styles.education}>{t.education.map((e) => <li key={e}>{e}</li>)}</ul>
            </section>
          )}
        </div>

        <aside className={styles.aside}>
          <div className={styles.panel}>
            {t.feeText && (
              <p className={styles.fee}>
                {t.feeText}
                <small>Agreed directly with {first}</small>
              </p>
            )}
            <RequestDemo tutor={{ id: t.id, firstName: first, subjects: t.subjects, classBands: t.classBands, modes: t.modes }} />
            <p className={styles.privacy}>Your number goes only to {first}. Nothing is shared publicly.</p>
          </div>
          <div className={styles.panelQuiet}>
            <h2>When {first} is free</h2>
            <Timetable grid={t.availability} />
          </div>
        </aside>
      </div>
    </article>
  );
}
