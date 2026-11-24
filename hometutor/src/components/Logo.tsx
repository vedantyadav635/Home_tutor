import Link from "next/link";
import styles from "./SiteHeader.module.css";

/** Wordmark with a small exercise-book mark: ruled lines and a red margin. */
export function Logo() {
  return (
    <Link href="/" className={styles.logo} aria-label="HomeTutor home">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect x="1" y="1" width="24" height="24" rx="6" fill="#fff" stroke="#18213a" strokeWidth="1.5" />
        <path d="M5 9.5h16M5 13.5h16M5 17.5h16" stroke="#c9d3e6" strokeWidth="1.2" />
        <path d="M8.5 4v18" stroke="#d9534a" strokeWidth="1.3" />
      </svg>
      <span>HomeTutor</span>
    </Link>
  );
}
