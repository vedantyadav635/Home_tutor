import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/dash.module.css";
import { bandLabel } from "@/components/tutor";
import { greeting, when } from "@/lib/format";
import { sentRequests } from "@/lib/requests";
import { requirePageRole } from "@/lib/session";

export const metadata: Metadata = { title: "Your requests" };

const EXPLAIN: Record<string, string> = {
  new: "Sent. The tutor will call you to fix a demo class.",
  contacted: "The tutor has been in touch with you.",
  accepted: "Accepted. You can call the tutor directly.",
  declined: "The tutor can't take this one. Try another tutor nearby.",
  closed: "Closed.",
};

export default async function ParentDashboard() {
  const { supabase, user, firstName } = await requirePageRole("parent", "/dashboard/parent");
  const result = await sentRequests(supabase, user.id);
  const requests = result.data ?? [];

  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <div>
          <h1>{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
          <p>Your demo class requests, newest first.</p>
        </div>
        <Link href="/tutors" className="btn btn-primary">Find a tutor</Link>
      </header>

      <section className={styles.section} aria-labelledby="requests">
        <div className={styles.sectionHead}>
          <h2 id="requests">Demo requests</h2>
        </div>
        {result.error && <p className="form-error">We couldn&rsquo;t load your requests. Refresh the page to try again.</p>}
        {requests.length === 0 && !result.error ? (
          <div className={styles.empty}>
            <h3>No requests yet</h3>
            <p>Find a tutor near you and ask for a demo class. Your requests and the tutor&rsquo;s replies will show up here.</p>
            <Link href="/tutors" className="btn btn-quiet">Browse tutors</Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {requests.map((r) => (
              <li key={r.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <p className={styles.itemTitle}>
                    {r.tutorSlug ? <Link href={`/tutors/${r.tutorSlug}`} className="link" style={{ color: "inherit" }}>{r.tutorName}</Link> : (r.tutorName ?? "Tutor no longer listed")}
                    <span className={`pill pill-${r.status}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span>
                  </p>
                  <p className={styles.itemMeta}>
                    <span>{r.subject}</span>
                    {r.classBand && <span>{bandLabel(r.classBand)}</span>}
                    <span>{r.mode}</span>
                  </p>
                  <p className={styles.itemMeta}>
                    {"tutorPhone" in r && r.tutorPhone ? (
                      <span>Accepted. Call {r.tutorName?.split(" ")[0]} on <a href={`tel:${r.tutorPhone}`}>{r.tutorPhone}</a></span>
                    ) : (
                      <span>{EXPLAIN[r.status]}</span>
                    )}
                  </p>
                  {r.message && <p className={styles.quote}>{r.message}</p>}
                </div>
                <div className={styles.itemSide}>
                  <span className={styles.time}>{when(r.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
