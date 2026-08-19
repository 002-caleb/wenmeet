"use client";

import { useState } from "react";

/**
 * The organizer's copy of the real participant link. The URL is built from
 * the live origin rather than a hardcoded domain, so it stays correct on
 * localhost, a deploy preview, and production alike.
 */
export function ShareLinkPanel({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/m/${shareToken}`;
  const display = typeof window === "undefined" ? path : `${window.location.host}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context or denied permission) — the
      // link stays visible and selectable, so this is recoverable.
      setCopied(false);
    }
  }

  return (
    <section aria-labelledby="share-link-label" style={{ marginBottom: "1.5rem" }}>
      <h2 id="share-link-label" className="ws-section-label">
        Share this WenMeet
      </h2>
      <div className="ws-panel share-panel">
        <p className="ws-muted-line" style={{ marginBottom: "0.75rem" }}>
          Send this link to anyone who should respond. They don&rsquo;t need an account.
        </p>
        <div className="share-link-row">
          <code className="share-link-url">{display}</code>
          <button type="button" onClick={copy} className="ws-btn ws-btn-primary ws-btn-sm">
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </section>
  );
}
