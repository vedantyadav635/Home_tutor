import Link from "next/link";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.about}>
          <p className={styles.brand}>HomeTutor</p>
          <p>Home tutors for Class 1–12 and exam prep, starting in Pune. Every profile is read by a person before it goes live.</p>
        </div>
        <nav aria-label="For parents">
          <p className={styles.head}>For parents</p>
          <Link href="/tutors">Find a tutor</Link>
          <Link href="/#how-it-works">How it works</Link>
        </nav>
        <nav aria-label="For tutors">
          <p className={styles.head}>For tutors</p>
          <Link href="/signup?role=tutor">Create a tutor profile</Link>
          <Link href="/login">Log in</Link>
        </nav>
        <nav aria-label="Help">
          <p className={styles.head}>Help</p>
          <Link href="/contact">Contact us</Link>
        </nav>
      </div>
      <div className={`wrap ${styles.base}`}>
        <span>© {new Date().getFullYear()} HomeTutor</span>
        <span>Pune, Maharashtra</span>
      </div>
    </footer>
  );
}
