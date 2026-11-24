import styles from "./forms.module.css";

/** Single-column form pages (log in, sign up, password, contact) on ruled paper. */
export default function FormsLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.paper}><div className={styles.sheet}>{children}</div></div>;
}
