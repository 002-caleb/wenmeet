/**
 * Global pre-release notice (docs/WIP_BANNER.md).
 *
 * Mounted once in the root layout so it sits above both the marketing nav
 * and the authenticated app shell — §11 requires a single centralized
 * component rather than per-page copies.
 *
 * Controlled by NEXT_PUBLIC_WIP_MODE so it can be switched off at launch
 * without deleting the code (§9). The value is read at module scope: it's
 * inlined at build time, so the banner is present in the initial server
 * render and causes no layout shift (§13).
 *
 * Deliberately not a live region — this is static page furniture, not an
 * event, so announcing it on every navigation would be noise.
 */

const WIP_ENABLED = process.env.NEXT_PUBLIC_WIP_MODE === "true";
const NOTICE = process.env.NEXT_PUBLIC_SITE_NOTICE?.trim() || "WIP · Under construction";

export function SiteStatusBanner() {
  if (!WIP_ENABLED) return null;

  return (
    <div className="site-status-banner">
      <span className="site-status-banner-text">{NOTICE}</span>
    </div>
  );
}
