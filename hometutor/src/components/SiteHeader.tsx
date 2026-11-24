import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";
import styles from "./SiteHeader.module.css";

async function currentAccount() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", data.user.id).maybeSingle();
  const role = profile?.role ?? "parent";
  const first = profile?.full_name?.split(" ")[0];
  return {
    label: role === "admin" ? "Admin" : first ? `${first}’s dashboard` : "Your dashboard",
    dashboard: role === "admin" ? "/admin" : `/dashboard/${role}`,
  };
}

export async function SiteHeader() {
  const account = await currentAccount();

  const nav = (
    <>
      <Link href="/tutors">Find a tutor</Link>
      <Link href="/signup?role=tutor">Teach with us</Link>
      <Link href="/contact">Contact</Link>
    </>
  );
  const auth = account ? (
    <>
      <Link href={account.dashboard} className="btn btn-quiet">{account.label}</Link>
      <LogoutButton className={styles.textButton} />
    </>
  ) : (
    <>
      <Link href="/login" className={styles.textLink}>Log in</Link>
      <Link href="/signup" className="btn btn-primary">Create account</Link>
    </>
  );

  return (
    <header className={styles.header}>
      <a href="#main" className={styles.skip}>Skip to content</a>
      <div className={`wrap ${styles.bar}`}>
        <Logo />
        <nav className={styles.nav} aria-label="Main">{nav}</nav>
        <div className={styles.auth}>{auth}</div>
        <details className={styles.menu}>
          <summary aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M3 7h16M3 15h16" stroke="currentColor" strokeWidth="1.6" /></svg>
          </summary>
          <div className={styles.menuPanel}>
            <nav aria-label="Mobile">{nav}</nav>
            <div className={styles.menuAuth}>{auth}</div>
          </div>
        </details>
      </div>
    </header>
  );
}
