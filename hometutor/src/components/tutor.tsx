import Image from "next/image";
import Link from "next/link";
import type { AvailabilityGrid, TutorCard } from "@/lib/mappers";
import { CLASS_BANDS, DAYS, TIME_SLOTS } from "@/lib/options";
import styles from "./tutor.module.css";

export const bandLabel = (v: string) => CLASS_BANDS.find((b) => b.value === v)?.label ?? v;

export function Seal({ size = 15 }: { size?: number }) {
  return (
    <span className="seal" title="Details checked by the HomeTutor team">
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 .8l1.7 1.3 2.1-.2.7 2 1.8 1.1-.5 2.1.9 1.9-1.6 1.4-.2 2.1-2.1.4L9.6 15 8 13.8 6.4 15l-1.2-1.8-2.1-.4-.2-2.1L1.3 9.3l.9-1.9-.5-2.1 1.8-1.1.7-2 2.1.2z" fill="currentColor" />
        <path d="M5.3 8.2l1.8 1.8 3.6-3.8" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  );
}

const TINTS = ["#e7ecfb", "#e6f2ec", "#f3ece2", "#efe9f8", "#e5eff4"];

export function Avatar({ name, photoUrl, size = 64 }: { name: string; photoUrl: string | null; size?: number }) {
  if (photoUrl)
    return <Image className={styles.avatar} src={photoUrl} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  const initials = name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const tint = TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
  return (
    <span className={styles.avatar} style={{ width: size, height: size, background: tint, fontSize: size * 0.36 }} aria-hidden="true">
      {initials}
    </span>
  );
}

/** One line in the results register. The whole row links to the profile. */
export function TutorRow({ t }: { t: TutorCard }) {
  return (
    <li className={styles.row}>
      <Avatar name={t.fullName} photoUrl={t.photoUrl} />
      <div className={styles.main}>
        <h3 className={styles.name}>
          <Link href={`/tutors/${t.slug}`} className={styles.rowLink}>{t.fullName}</Link>
          {t.verified && <Seal />}
        </h3>
        <p className={styles.meta}>
          {t.qualification && <span>{t.qualification}</span>}
          {t.yearsExperience != null && <span>{t.yearsExperience} {t.yearsExperience === 1 ? "year" : "years"} teaching</span>}
        </p>
        {t.bio && <p className={styles.bio}>{t.bio}</p>}
        <p className={styles.tags}>
          {t.subjects.map((s) => <span key={s} className={styles.subject}>{s}</span>)}
          {t.classBands.map((b) => <span key={b} className={styles.band}>{bandLabel(b)}</span>)}
        </p>
      </div>
      <div className={styles.side}>
        {t.feeText && <p className={styles.fee}>{t.feeText}</p>}
        <p className={styles.place}>{[t.area, t.city].filter(Boolean).join(", ")}</p>
        <p className={styles.modes}>{t.modes.join(" or ")}</p>
      </div>
    </li>
  );
}

const SLOT_LABEL = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const;

/** The weekly timetable: days across, time of day down. */
export function Timetable({ grid }: { grid: AvailabilityGrid }) {
  const free = DAYS.flatMap((d) => TIME_SLOTS.filter((s) => grid[d][s]).map((s) => `${d} ${s}`));
  return (
    <table className={styles.timetable}>
      <caption className="visually-hidden">Weekly availability. Free: {free.length ? free.join(", ") : "none listed"}.</caption>
      <thead>
        <tr>
          <th scope="col"><span className="visually-hidden">Time</span></th>
          {DAYS.map((d) => <th key={d} scope="col">{d}</th>)}
        </tr>
      </thead>
      <tbody>
        {TIME_SLOTS.map((s) => (
          <tr key={s}>
            <th scope="row">{SLOT_LABEL[s]}</th>
            {DAYS.map((d) => (
              <td key={d}>
                <span className={grid[d][s] ? styles.slotOn : styles.slotOff} aria-hidden="true" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
