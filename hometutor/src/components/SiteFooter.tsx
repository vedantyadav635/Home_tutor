import Link from "next/link";
import { CLASS_BANDS } from "@/lib/options";
import { Logo } from "./Logo";
import styles from "./SiteFooter.module.css";

const SUBJECTS = ["Maths", "Science", "Physics", "Chemistry", "Biology", "English"] as const;

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.about}>
          <Logo />
          <p className={styles.statement}>Find a tutor who comes to you, or teach students near you.</p>
          <p className={styles.small}>Home tutors for Class 1–12 and exam prep, starting in Pune. Every profile is reviewed before it is listed.</p>
          <div className={styles.cta}>
            <Link href="/tutors" className="btn btn-primary">Find a tutor</Link>
            <Link href="/signup?role=tutor" className="btn btn-quiet">Teach with us</Link>
          </div>
        </div>

        <nav aria-label="Tutors by subject">
          <p className={styles.head}>By subject</p>
          {SUBJECTS.map((s) => <Link key={s} href={`/tutors?subject=${s}`}>{s}</Link>)}
        </nav>
        <nav aria-label="Tutors by class">
          <p className={styles.head}>By class</p>
          {CLASS_BANDS.map((b) => <Link key={b.value} href={`/tutors?band=${b.value}`}>{b.label}</Link>)}
        </nav>
        <nav aria-label="Help">
          <p className={styles.head}>HomeTutor</p>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/contact">Contact us</Link>
          <Link href="/signup">Create an account</Link>
          <Link href="/login">Log in</Link>
        </nav>
      </div>

      <div className={styles.baseWrap}>
        <div className={`wrap ${styles.base}`}>
          <span>© {new Date().getFullYear()} HomeTutor</span>
          <span>Pune, Maharashtra</span>
        </div>
      </div>
    </footer>
  );
}
