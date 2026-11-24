import Link from "next/link";
import { TutorRow } from "@/components/tutor";
import { CLASS_BANDS, SUBJECTS } from "@/lib/options";
import { createPublicClient } from "@/lib/supabase/server";
import { featuredTutors, searchTutors, SearchQuery } from "@/lib/tutors";
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

  return (
    <>
      <section className={styles.hero}>
        <div className={`wrap ${styles.heroInner}`}>
          <h1 className={styles.title}>Home tutors in Pune, checked before you meet them.</h1>
          <p className={styles.lede}>
            Read real profiles, see which evenings a tutor is free, and ask for a demo class. You agree the fee with the tutor directly.
          </p>

          {/* A worksheet sentence. Plain GET form: works without JavaScript. */}
          <form action="/tutors" className={styles.sentence} role="search" aria-label="Find a tutor">
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
            <button className={`btn btn-primary ${styles.go}`}>Show tutors</button>
          </form>

          <p className={styles.count}>
            {total > 0 ? `${total} tutors listed in Pune so far. Each one was read and approved by us.` : "Tutor profiles are being reviewed. Check back soon."}
          </p>
        </div>
      </section>

      {tutors.length > 0 && (
        <section className={`wrap ${styles.section}`} aria-labelledby="verified">
          <div className={styles.sectionHead}>
            <h2 id="verified">Verified tutors</h2>
            <p>Tutors whose details our team has checked.</p>
            <Link href="/tutors" className="link">See all {total} tutors</Link>
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
