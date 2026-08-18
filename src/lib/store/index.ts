import { InMemoryStore } from "./InMemoryStore";
import { SupabaseStore } from "./SupabaseStore";
import type { NebulaStore } from "./NebulaStore";

let singleton: NebulaStore | null = null;

/**
 * Factory selecting the store implementation from DATA_STORE.
 * "memory" (default) — dev/demo only.
 * "supabase" — required for every production deployment (see README).
 */
export function getStore(): NebulaStore {
  if (singleton) return singleton;

  const mode = process.env.DATA_STORE ?? "memory";
  if (mode === "supabase") {
    singleton = new SupabaseStore(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    );
  } else {
    singleton = new InMemoryStore();
  }
  return singleton;
}

export type { NebulaStore } from "./NebulaStore";
