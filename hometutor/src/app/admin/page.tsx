import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/dash.module.css";
import { bandLabel, Seal } from "@/components/tutor";
import { adminStats, adminTutors, contactMessages, type TutorStatus } from "@/lib/admin";
import { when } from "@/lib/format";
import { requirePageRole } from "@/lib/session";
import { MessageAction, TutorReview } from "./actions";

export const metadata: Metadata = { title: "Admin" };

const TABS: { key: TutorStatus | "messages"; label: string }[] = [
  { key: "pending", label: "Waiting for review" },
  { key: "approved", label: "Live" },
  { key: "rejected", label: "Sent back" },
  { key: "draft", label: "Drafts" },
  { key: "messages", label: "Messages" },
];

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const { supabase } = await requirePageRole("admin", "/admin");
  const raw = (await searchParams).tab;
  const tab = TABS.some((t) => t.key === raw) ? (raw as (typeof TABS)[number]["key"]) : "pending";

  const [stats, tutors, messages] = await Promise.all([
    adminStats(supabase),
    tab === "messages" ? Promise.resolve(null) : adminTutors(supabase, tab),
    tab === "messages" ? contactMessages(supabase) : Promise.resolve(null),
  ]);
  const s = stats.data;
  const count = (k: string) => (k === "messages" ? s?.unhandledContactMessages : s?.tutors[k as TutorStatus]) ?? 0;

  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <div>
          <h1>Admin</h1>
          <p>Review tutor profiles, add the Verified badge, and answer messages.</p>
        </div>
      </header>

      {s && (
        <dl className={styles.figures} style={{ marginTop: "2rem" }}>
          <div className={styles.figure}><dt>Waiting for review</dt><dd>{s.tutors.pending}</dd></div>
          <div className={styles.figure}><dt>Live tutors</dt><dd>{s.tutors.approved}</dd></div>
          <div className={styles.figure}><dt>Demo requests, last 7 days</dt><dd>{s.demoRequests.last7Days}</dd></div>
          <div className={styles.figure}><dt>Unanswered messages</dt><dd>{s.unhandledContactMessages}</dd></div>
        </dl>
      )}

      <section className={styles.section}>
        <nav className={styles.tabs} aria-label="Sections" style={{ marginBottom: "1.25rem" }}>
          {TABS.map((t) => (
            <Link key={t.key} href={`/admin?tab=${t.key}`} className={styles.tab} aria-current={tab === t.key ? "page" : undefined}>
              {t.label} <span className={styles.tabCount}>{count(t.key)}</span>
            </Link>
          ))}
        </nav>

        {tab !== "messages" && tutors && (
          tutors.error ? <p className="form-error">Couldn&rsquo;t load tutors. Refresh to try again.</p> :
          tutors.data.length === 0 ? (
            <div className={styles.empty}><h3>Nothing here</h3><p>{tab === "pending" ? "No profiles are waiting for review." : "No tutors in this list."}</p></div>
          ) : (
            <ul className={styles.list}>
              {tutors.data.map((t) => (
                <li key={t.id} className={styles.item}>
                  <div className={styles.itemMain}>
                    <p className={styles.itemTitle}>
                      <Link href={`/tutors/${t.slug}`} className="link" style={{ color: "inherit" }} target="_blank">{t.fullName}</Link>
                      {t.verified && <Seal />}
                      {t.featured && <span className="pill">Featured</span>}
                    </p>
                    <p className={styles.itemMeta}>
                      {t.qualification && <span>{t.qualification}</span>}
                      {t.yearsExperience != null && <span>{t.yearsExperience} years</span>}
                      {t.area && <span>{[t.area, t.city].filter(Boolean).join(", ")}</span>}
                      {t.phone ? <a href={`tel:+91${t.phone}`}>{t.phone}</a> : <span>No phone</span>}
                    </p>
                    <p className={styles.itemMeta}>
                      <span>{t.subjects.join(", ") || "No subjects"}</span>
                      <span>{t.classBands.map(bandLabel).join(", ")}</span>
                      {t.feeText && <span>{t.feeText}</span>}
                    </p>
                    {t.bio && <p className={styles.quote}>{t.bio}</p>}
                    {t.reviewNote && <p className={styles.itemMeta}><span><strong>Review note:</strong> {t.reviewNote}</span></p>}
                    <TutorReview id={t.id} status={t.status} verified={t.verified} featured={t.featured} />
                  </div>
                  <div className={styles.itemSide}>
                    <span className={styles.time}>{t.submittedAt ? `Submitted ${when(t.submittedAt)}` : "Not submitted"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "messages" && messages && (
          messages.error ? <p className="form-error">Couldn&rsquo;t load messages. Refresh to try again.</p> :
          messages.data.length === 0 ? (
            <div className={styles.empty}><h3>No messages</h3><p>Messages from the contact form show up here.</p></div>
          ) : (
            <ul className={styles.list}>
              {messages.data.map((m) => (
                <li key={m.id} className={styles.item} style={m.handled ? { opacity: 0.6 } : undefined}>
                  <div className={styles.itemMain}>
                    <p className={styles.itemTitle}>{m.name} <span className="pill">{m.senderType}</span></p>
                    <p className={styles.itemMeta}>
                      {m.reach.includes("@") ? <a href={`mailto:${m.reach}`}>{m.reach}</a> : <a href={`tel:${m.reach.replace(/\s/g, "")}`}>{m.reach}</a>}
                    </p>
                    <p className={styles.quote}>{m.message}</p>
                  </div>
                  <div className={styles.itemSide}>
                    <span className={styles.time}>{when(m.createdAt)}</span>
                    <MessageAction id={m.id} handled={m.handled} />
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </div>
  );
}
