"use client";

import { useState } from "react";

/**
 * The organizer's copy of the real participant link. The URL is built from
 * the live origin rather than a hardcoded domain, so it stays correct on
 * localhost, a deploy preview, and production alike.
 *
 * `justCreated` promotes it right after the wizard finishes — a new meeting
 * does nothing until the link reaches people, so that is the one moment it
 * deserves to be the loudest thing on the page.
 */
export function ShareLinkPanel({
  shareToken,
  justCreated = false,
}: {
  shareToken: string;
  justCreated?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const path = `/m/${shareToken}`;
  const display = typeof window === "undefined" ? path : `${window.location.host}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      localStorage.setItem("wenmeet:shared-invite", "complete");
      window.dispatchEvent(new Event("wenmeet:progress"));
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
        {justCreated ? "Your WenMeet is ready" : "Share this WenMeet"}
      </h2>
      <div className={`ws-panel share-panel${justCreated ? " share-panel-fresh" : ""}`}>
        <p className="ws-muted-line" style={{ marginBottom: "0.75rem" }}>
          {justCreated
            ? "Send this link to everyone who should respond. They don't need an account."
            : "Send this link to anyone who should respond. They don't need an account."}
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
