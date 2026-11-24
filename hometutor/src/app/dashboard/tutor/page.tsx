import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/dash.module.css";
import { bandLabel } from "@/components/tutor";
import { greeting, when } from "@/lib/format";
import { receivedRequests, REQUEST_STATUSES, requestSummary, type RequestStatus } from "@/lib/requests";
import { requirePageRole } from "@/lib/session";
import { loadOwnProfile } from "@/lib/tutor-profile";
import { ProfileAction, RequestActions } from "./actions";

export const metadata: Metadata = { title: "Tutor dashboard" };

const TAB_LABEL: Record<RequestStatus, string> = { new: "New", contacted: "Contacted", accepted: "Accepted", declined: "Declined", closed: "Closed" };

type Props = { searchParams: Promise<{ status?: string }> };

export default async function TutorDashboard({ searchParams }: Props) {
  const { supabase, user, firstName } = await requirePageRole("tutor", "/dashboard/tutor");
  const raw = (await searchParams).status;
  const status = REQUEST_STATUSES.includes(raw as RequestStatus) ? (raw as RequestStatus) : undefined;

  const [own, summary, requests] = await Promise.all([
    loadOwnProfile(supabase, user.id),
    requestSummary(supabase, user.id),
    receivedRequests(supabase, user.id, status),
  ]);
  const profile = own.data ?? null;
  const counts = summary.data;
  const list = requests.data ?? [];

  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <div>
          <h1>{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
          <p>{counts?.new ? `You have ${counts.new} new ${counts.new === 1 ? "request" : "requests"} to answer.` : "No new requests right now."}</p>
        </div>
        <div className={styles.actions}>
          {profile?.status === "approved" && <Link href={`/tutors/${profile.slug}`} className="btn btn-quiet">View public profile</Link>}
          <Link href="/dashboard/tutor/profile" className="btn btn-primary">{profile ? "Edit profile" : "Create your profile"}</Link>
        </div>
      </header>

      <section className={styles.section} aria-label="Profile status">
        <StatusPanel profile={profile} />
      </section>

      <section className={styles.section} aria-labelledby="inbox">
        <div className={styles.sectionHead}>
          <h2 id="inbox">Demo requests</h2>
          <nav className={styles.tabs} aria-label="Filter requests">
            <Link className={styles.tab} href="/dashboard/tutor" aria-current={!status ? "page" : undefined}>
              All <span className={styles.tabCount}>{counts?.total ?? 0}</span>
            </Link>
            {REQUEST_STATUSES.map((s) => (
              <Link key={s} className={styles.tab} href={`/dashboard/tutor?status=${s}`} aria-current={status === s ? "page" : undefined}>
                {TAB_LABEL[s]} <span className={styles.tabCount}>{counts?.[s] ?? 0}</span>
              </Link>
            ))}
          </nav>
        </div>

        {requests.error && <p className="form-error">We couldn&rsquo;t load your requests. Refresh the page to try again.</p>}
        {list.length === 0 && !requests.error ? (
          <div className={styles.empty}>
            <h3>{status ? `No ${TAB_LABEL[status].toLowerCase()} requests` : "No requests yet"}</h3>
            <p>{profile?.status === "approved" ? "When a parent asks for a demo class, it appears here with their number." : "Requests start once your profile is approved and visible to parents."}</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {list.map((r) => (
              <li key={r.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <p className={styles.itemTitle}>
                    {r.parentName}
                    <span className={`pill pill-${r.status}`}>{TAB_LABEL[r.status as RequestStatus]}</span>
                  </p>
                  <p className={styles.itemMeta}>
                    <a href={`tel:+91${r.parentPhone}`}>{r.parentPhone.replace(/(\d{5})(\d{5})/, "$1 $2")}</a>
                    <span>{r.subject}</span>
                    {r.classBand && <span>{bandLabel(r.classBand)}</span>}
                    <span>{r.mode}</span>
                  </p>
                  {r.message && <p className={styles.quote}>{r.message}</p>}
                  <RequestActions id={r.id} status={r.status} note={r.tutorNote} />
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

function StatusPanel({ profile }: { profile: Awaited<ReturnType<typeof loadOwnProfile>>["data"] | null }) {
  if (!profile)
    return (
      <div className={styles.status}>
        <div>
          <h2>Create your tutor profile</h2>
          <p>Four short steps: basic details, subjects and classes, experience, then timings and fees. You can save and come back.</p>
        </div>
        <Link href="/dashboard/tutor/profile" className="btn btn-primary">Start</Link>
      </div>
    );

  const tone = { draft: "var(--muted)", pending: "#d4a300", approved: "var(--ok)", rejected: "var(--margin)" }[profile.status] ?? "var(--muted)";
  return (
    <div className={styles.status} style={{ "--tone": tone } as React.CSSProperties}>
      <div>
        <h2>
          {profile.status === "draft" && "Your profile is a draft"}
          {profile.status === "pending" && "Your profile is being reviewed"}
          {profile.status === "approved" && "Your profile is live"}
          {profile.status === "rejected" && "Your profile needs changes"}
        </h2>
        <p>
          {profile.status === "draft" && "Parents can't see it yet. Finish the four steps, then submit it for review."}
          {profile.status === "pending" && `Submitted ${when(profile.submittedAt)}. We'll publish it once the details check out.`}
          {profile.status === "approved" && "Parents can find you in search and send you demo requests."}
          {profile.status === "rejected" && "Update your profile and submit it again."}
        </p>
        {profile.reviewNote && profile.status !== "approved" && (
          <p className={styles.note}><strong>Note from our team</strong>{profile.reviewNote}</p>
        )}
      </div>
      <div className={styles.actions}>
        {(profile.status === "draft" || profile.status === "rejected") && <ProfileAction action="submit" />}
        {(profile.status === "approved" || profile.status === "pending") && <ProfileAction action="unpublish" />}
      </div>
    </div>
  );
}
