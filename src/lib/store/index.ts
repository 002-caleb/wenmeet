import { InMemoryStore } from "./InMemoryStore";
import { NetlifyDatabaseStore } from "./NetlifyDatabaseStore";
import type { NebulaStore } from "./NebulaStore";

let singleton: NebulaStore | null = null;

/**
 * Factory selecting the store implementation from DATA_STORE.
 * "memory" (default) — dev/demo only, does not persist across a Netlify
 *   Functions cold start.
 * "netlify" — Netlify Database (managed Postgres). Required for every
 *   production deployment — see README and netlify.toml.
 */
export function getStore(): NebulaStore {
  if (singleton) return singleton;

  const mode = process.env.DATA_STORE ?? "memory";
  singleton = mode === "netlify" ? new NetlifyDatabaseStore() : new InMemoryStore();
  return singleton;
}

export type { NebulaStore } from "./NebulaStore";
