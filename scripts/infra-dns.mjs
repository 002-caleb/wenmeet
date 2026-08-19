#!/usr/bin/env node
// Declarative DNS for WenMeet — plan/apply against Netlify DNS.
//
// Netlify has no native declarative DNS (netlify.toml covers build, redirects
// and headers, but not zone records), so records otherwise exist only as
// dashboard clicks that nobody can review or reproduce. This gives them a
// reviewable spec in git and an idempotent way to reach it.
//
//   npm run infra:dns:plan     show the diff, change nothing
//   npm run infra:dns:apply    make the zone match the spec
//
// Auth: NETLIFY_AUTH_TOKEN if set (CI), otherwise the session the Netlify
// CLI already stored, so there is nothing extra to configure after
// `netlify login`. Re-running is safe — the plan is computed from live state.
//
// SAFETY: this never deletes a record the spec does not declare. DNS
// deletion is destructive and easy to get wrong — unmanaged records are
// reported and left alone.

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const APPLY = process.argv.includes("--apply");
const SPEC_PATH = new URL("../infra/dns.json", import.meta.url);
const API = "https://api.netlify.com/api/v1";

const color = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * CI supplies NETLIFY_AUTH_TOKEN; locally we reuse the session the Netlify
 * CLI already stored, so there is nothing extra to configure after
 * `netlify login`.
 */
async function resolveToken() {
  if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN;

  // Location differs by platform; these cover macOS and Linux/XDG.
  const candidates = [
    join(homedir(), "Library", "Preferences", "netlify", "config.json"),
    join(homedir(), ".config", "netlify", "config.json"),
    join(homedir(), ".netlify", "config.json"),
  ];

  for (const path of candidates) {
    try {
      const cfg = JSON.parse(await readFile(path, "utf8"));
      for (const user of Object.values(cfg.users ?? {})) {
        const token = user?.auth?.token;
        if (token) return token;
      }
    } catch {
      // Missing or unreadable on this platform — try the next candidate.
    }
  }
  throw new Error("No Netlify credentials. Run `netlify login`, or set NETLIFY_AUTH_TOKEN.");
}

let tokenPromise;

/**
 * Talks to the REST API directly rather than shelling out to `netlify api`:
 * that wrapper does not pass a JSON body through correctly on POST, which
 * fails every record creation with an opaque "Unprocessable Entity".
 */
async function netlifyApi(path, { method = "GET", body } = {}) {
  tokenPromise ??= resolveToken();
  const token = await tokenPromise;

  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

/** Netlify DNS has no update operation — a changed value is delete + create. */
function sameRecord(desired, actual) {
  return (
    actual.type === desired.type &&
    actual.hostname === desired.hostname &&
    actual.value === desired.value
  );
}

async function main() {
  const spec = JSON.parse(await readFile(SPEC_PATH, "utf8"));

  // Resolve the zone by name; hardcoding an id would break the moment the
  // zone is recreated or the spec is reused for another environment.
  const zones = await netlifyApi("/dns_zones");
  const zone = zones.find((z) => z.name === spec.zone);
  if (!zone) {
    console.error(color.red(`Zone ${spec.zone} not found on this Netlify account.`));
    process.exit(1);
  }

  const existing = await netlifyApi(`/dns_zones/${zone.id}/dns_records`);

  const creates = [];
  const replaces = [];
  const unchanged = [];

  for (const desired of spec.records) {
    const matches = existing.filter(
      (r) => r.type === desired.type && r.hostname === desired.hostname,
    );
    if (matches.length === 0) {
      creates.push(desired);
    } else if (matches.some((m) => sameRecord(desired, m))) {
      unchanged.push(desired);
    } else {
      replaces.push({ desired, stale: matches });
    }
  }

  const managed = new Set(spec.records.map((r) => `${r.type} ${r.hostname}`));
  const unmanaged = existing.filter((r) => !managed.has(`${r.type} ${r.hostname}`));

  console.log(color.bold(`\nDNS plan for ${spec.zone}`));
  console.log(color.dim(`  zone ${zone.id} · ${existing.length} records live · ${spec.records.length} declared\n`));

  for (const r of unchanged) {
    console.log(`  ${color.dim("no change")}  ${r.type} ${r.hostname}`);
  }
  for (const r of creates) {
    console.log(`  ${color.green("+ create ")}  ${r.type} ${r.hostname} ${color.dim("->")} ${r.value}`);
    if (r.why) console.log(color.dim(`               ${r.why}`));
  }
  for (const { desired, stale } of replaces) {
    console.log(`  ${color.yellow("~ replace")}  ${desired.type} ${desired.hostname}`);
    for (const s of stale) console.log(color.dim(`               was ${s.value}`));
    console.log(color.dim(`               now ${desired.value}`));
  }
  if (unmanaged.length > 0) {
    console.log(color.dim(`\n  ${unmanaged.length} unmanaged record(s) in this zone — left untouched:`));
    for (const r of unmanaged) console.log(color.dim(`    ${r.type} ${r.hostname}`));
  }

  const changeCount = creates.length + replaces.length;
  if (changeCount === 0) {
    console.log(color.green("\n✓ Zone already matches the spec. Nothing to do.\n"));
    return;
  }

  if (!APPLY) {
    console.log(color.bold(`\n${changeCount} change(s) pending.`));
    console.log(`Run ${color.bold("npm run infra:dns:apply")} to make them.\n`);
    return;
  }

  console.log(color.bold(`\nApplying ${changeCount} change(s)…\n`));

  for (const { stale } of replaces) {
    for (const s of stale) {
      await netlifyApi(`/dns_zones/${zone.id}/dns_records/${s.id}`, { method: "DELETE" });
      console.log(`  ${color.yellow("removed")}  ${s.type} ${s.hostname} ${color.dim(s.value)}`);
    }
  }

  for (const r of [...creates, ...replaces.map((x) => x.desired)]) {
    await netlifyApi(`/dns_zones/${zone.id}/dns_records`, {
      method: "POST",
      body: { type: r.type, hostname: r.hostname, value: r.value, ttl: r.ttl ?? 3600 },
    });
    console.log(`  ${color.green("created")}  ${r.type} ${r.hostname} ${color.dim("-> " + r.value)}`);
  }

  console.log(color.green("\n✓ Applied. DNS propagation typically takes a few minutes.\n"));
}

main().catch((err) => {
  console.error(color.red("\nDNS sync failed:"), err.message);
  if (/credentials|401|403/i.test(err.message)) {
    console.error(color.dim("Run `netlify login`, or set NETLIFY_AUTH_TOKEN in CI.\n"));
  }
  process.exit(1);
});
