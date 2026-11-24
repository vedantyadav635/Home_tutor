import Link from "next/link";
import { Avatar, bandLabel, Seal, Timetable, TutorRow } from "@/components/tutor";
import type { TutorCard } from "@/lib/mappers";
import { CLASS_BANDS, SUBJECTS } from "@/lib/options";
import { createPublicClient } from "@/lib/supabase/server";
import { featuredTutors, searchTutors, SearchQuery, tutorBySlug } from "@/lib/tutors";
import styles from "./page.module.css";

export const revalidate = 60;

const AREAS = ["Kothrud", "Baner", "Aundh", "Shivaji Nagar", "Hadapsar", "Kharadi", "Viman Nagar", "Wakad", "Hinjewadi", "Pimple Saudagar", "Wanowrie", "Kondhwa"];

export default async function Home() {
  const supabase = createPublicClient();
  const [featured, all] = await Promise.all([
    featuredTutors(supabase),
    searchTutors(supabase, SearchQuery.parse({ board: [], band: [], subject: [], mode: [], lang: [], pageSize: 1 })),
  ]);
  const tutors = featured.data ?? [];
  const total = all.data?.total ?? 0;
  // The first sheet in the hero shows a real weekly timetable, so load that tutor's full profile.
  const lead = tutors[0] ? (await tutorBySlug(supabase, tutors[0].slug)).data : null;
  const second = tutors[1] ?? null;

  return (
    <>
      <section className={styles.hero}>
        <div className={`wrap ${styles.heroInner}`}>
          <div className={styles.copy}>
            <h1 className={styles.title}>Home tutors in Pune, reviewed before they&rsquo;re listed.</h1>
            <p className={styles.lede}>
              Read each tutor&rsquo;s experience, fees and weekly timetable, then ask for a free demo class. You agree the fee with the tutor directly.
            </p>

            {/* A worksheet sentence. Plain GET form: works without JavaScript. */}
            <form action="/tutors" className={styles.sentence} role="search" aria-label="Find a tutor">
              <div className={styles.line}>
                <span>I&rsquo;m looking for a</span>
                <label className={styles.blank}>
                  <span className="visually-hidden">Subject</span>
                  <select name="subject" defaultValue="">
                    <option value="">any subject</option>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <span>tutor for</span>
                <label className={styles.blank}>
                  <span className="visually-hidden">Class</span>
                  <select name="band" defaultValue="">
                    <option value="">any class</option>
                    {CLASS_BANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </label>
                <span>near</span>
                <label className={styles.blank}>
                  <span className="visually-hidden">Area</span>
                  <input name="loc" list="areas" placeholder="any area" autoComplete="off" />
                </label>
                <datalist id="areas">{AREAS.map((a) => <option key={a} value={a} />)}</datalist>
              </div>
              <button className={`btn btn-primary ${styles.go}`}>Show tutors</button>
            </form>

            <p className={styles.below}>
              {total > 0 ? `${total} ${total === 1 ? "tutor" : "tutors"} listed in Pune so far.` : "Tutor profiles are being reviewed. Check back soon."}{" "}
              <Link href="/signup?role=tutor" className="link">Teach with us</Link>
            </p>
          </div>

          {lead && (
            <div className={styles.desk}>
              {second && <BackSheet t={second} />}
              <Link href={`/tutors/${lead.slug}`} className={`${styles.sheet} ${styles.front}`}>
                <div className={styles.sheetHead}>
                  <Avatar name={lead.fullName} photoUrl={lead.photoUrl} size={56} />
                  <div>
                    <p className={styles.sheetName}>{lead.fullName}</p>
                    <p className={styles.sheetMeta}>
                      {lead.qualification && <span>{lead.qualification}</span>}
                      {lead.yearsExperience != null && <span>{lead.yearsExperience} years teaching</span>}
                    </p>
                  </div>
                  {lead.verified && <Seal />}
                </div>
                <p className={styles.tags}>
                  {lead.subjects.map((s) => <span key={s} className={styles.subject}>{s}</span>)}
                  {lead.classBands.map((b) => <span key={b} className={styles.band}>{bandLabel(b)}</span>)}
                </p>
                <div className={styles.table}>
                  <p className={styles.tableLabel}>When {lead.fullName.split(" ")[0]} is free</p>
                  <Timetable grid={lead.availability} />
                </div>
                <div className={styles.sheetFoot}>
                  <span className={styles.fee}>{lead.feeText}</span>
                  <span>{[lead.area, lead.city].filter(Boolean).join(", ")}</span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </section>

      {tutors.length > 0 && (
        <section className={`wrap ${styles.section}`} aria-labelledby="verified">
          <div className={styles.sectionHead}>
            <h2 id="verified">Verified tutors</h2>
            <p>Tutors whose details our team has checked.</p>
            <Link href="/tutors" className="link">See all {total} {total === 1 ? "tutor" : "tutors"}</Link>
          </div>
          <ul className={styles.list}>
            {tutors.map((t) => <TutorRow key={t.id} t={t} />)}
          </ul>
        </section>
      )}

      <section id="how-it-works" className={`wrap ${styles.section}`} aria-labelledby="how">
        <div className={styles.sectionHead}>
          <h2 id="how">How it works</h2>
        </div>
        <div className={styles.how}>
          <div>
            <h3>For parents</h3>
            <ol className={styles.steps}>
              <li><strong>Search by subject, class and area.</strong> Filters match what the tutor actually teaches.</li>
              <li><strong>Read the profile.</strong> Experience, results, fees and a weekly timetable, written by the tutor.</li>
              <li><strong>Ask for a demo class.</strong> The tutor calls you to fix a time. Your number goes only to that tutor.</li>
            </ol>
          </div>
          <div>
            <h3>For tutors</h3>
            <ol className={styles.steps}>
              <li><strong>Create your profile</strong> in four short steps. Save as you go.</li>
              <li><strong>We review it</strong> and publish it once the details check out.</li>
              <li><strong>Parents nearby send requests.</strong> You choose who to call. Your number stays private until you accept.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className={`wrap ${styles.section}`}>
        <div className={styles.teach}>
          <div>
            <h2>Teach students near you</h2>
            <p>Choose your subjects, classes, timings and fees. Parents in your area find you by locality.</p>
          </div>
          <Link href="/signup?role=tutor" className="btn btn-primary">Create a tutor profile</Link>
        </div>
      </section>
    </>
  );
}

/** The sheet peeking out behind the main one. Decorative: the same tutor is listed properly below. */
function BackSheet({ t }: { t: TutorCard }) {
  return (
    <div className={`${styles.sheet} ${styles.back}`} aria-hidden="true">
      <div className={styles.sheetHead}>
        <Avatar name={t.fullName} photoUrl={t.photoUrl} size={44} />
        <div>
          <p className={styles.sheetName}>{t.fullName}</p>
          <p className={styles.sheetMeta}>{t.qualification}</p>
        </div>
      </div>
    </div>
  );
}
