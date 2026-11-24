import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap" style={{ paddingBlock: "clamp(4rem, 10vw, 7rem)", maxWidth: 640 }}>
      <h1 style={{ fontSize: "var(--t-3xl)" }}>This page isn&rsquo;t here</h1>
      <p style={{ marginTop: "1rem", color: "var(--ink-2)" }}>
        The link may be old, or the tutor may have paused their profile.
      </p>
      <p style={{ marginTop: "1.75rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href="/tutors" className="btn btn-primary">Find a tutor</Link>
        <Link href="/" className="btn btn-quiet">Go to the home page</Link>
      </p>
    </div>
  );
}
