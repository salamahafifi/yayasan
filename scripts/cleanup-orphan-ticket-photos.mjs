#!/usr/bin/env node
/**
 * Remove orphaned objects from private ticket-photos via Storage API.
 * Paths come from SQL (storage.objects); deletion uses storage.from().remove().
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ORPHAN_PATHS='a.jpeg,b.jpeg' node scripts/cleanup-orphan-ticket-photos.mjs
 * Or pass paths as argv after --
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const fromEnv = (process.env.ORPHAN_PATHS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const fromArgv = process.argv.slice(2).filter((a) => a !== "--");
const orphans = fromEnv.length ? fromEnv : fromArgv;

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(JSON.stringify({ orphan_count: orphans.length, orphans }, null, 2));

if (orphans.length === 0) {
  console.log("Nothing to remove.");
  process.exit(0);
}

const { data: removed, error: removeError } = await supabase.storage
  .from("ticket-photos")
  .remove(orphans);

if (removeError) {
  console.error("remove failed:", removeError);
  process.exit(1);
}

console.log(JSON.stringify({ removed: (removed ?? []).map((r) => r.name) }, null, 2));
