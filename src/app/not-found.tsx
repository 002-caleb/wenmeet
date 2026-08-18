import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" style={{ maxWidth: 480, textAlign: "center", paddingTop: "4rem" }}>
      <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "0 0 0.6rem" }}>
        This page doesn&rsquo;t exist.
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.75rem" }}>
        The link might be old, or the meeting might have been cancelled.
      </p>
      <Link href="/" className="pill-button pill-button-primary">
        Back to WenMeet
      </Link>
    </main>
  );
}
