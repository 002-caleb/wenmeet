"use client";

import { useEffect, useState } from "react";

/**
 * Shows the shape of a real share link using whatever host the page is
 * actually served from — the app is deployed to Netlify today but the same
 * image runs anywhere (see Dockerfile), so nothing here may assume a domain.
 *
 * Renders a neutral placeholder on the server so the markup is identical on
 * both passes; the real host is filled in after mount. Deliberately not
 * copyable: a token only exists once an organizer creates a meeting, so a
 * "Copy link" button here would hand over a URL that goes nowhere.
 */
export function SampleShareLink() {
  const [host, setHost] = useState("your-wenmeet-domain");

  useEffect(() => setHost(window.location.host), []);

  return (
    <div className="link-copy link-copy-sample">
      <code>
        {host}/m/&hellip;
      </code>
      <span className="link-copy-note">Every WenMeet gets its own link</span>
    </div>
  );
}
