import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://aduan.sahkan.my",
]);

const VALID_CATEGORIES = new Set([
  "longkang_tersumbat",
  "jalan_berlubang",
  "lampu_jalan",
  "sampah",
  "semak",
  "lain_lain",
]);

/** Malaysia bounding box (Peninsular + East Malaysia) for client-supplied pins. */
const MY_LAT_MIN = 0.85;
const MY_LAT_MAX = 7.5;
const MY_LNG_MIN = 99.6;
const MY_LNG_MAX = 119.3;

/** Johor bounding box for accepting geocoded results. */
const JOHOR_LAT_MIN = 1.2;
const JOHOR_LAT_MAX = 2.8;
const JOHOR_LNG_MIN = 102.4;
const JOHOR_LNG_MAX = 104.8;

const CONSENT_VERSION = "2026-07-29";
const RATE_LIMIT_PER_HOUR = 5;
const GEOCODE_TIMEOUT_MS = 5000;

const VALID_LANGUAGES = new Set(["ms", "en", "zh", "ta"]);

const VOICE_NOTE_BUCKET = "ticket-voice-notes";
const MAX_VOICE_NOTE_BYTES = 2 * 1024 * 1024;
const VOICE_NOTE_EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

/**
 * Uploads the recording to the private staff-only bucket and returns its
 * storage path. Returns null on any problem: a voice note is supporting
 * evidence, and losing the whole complaint over it would be far worse.
 */
async function storeVoiceNote(
  note: { mime?: string; data?: string } | null | undefined,
): Promise<string | null> {
  if (!note || typeof note.data !== "string" || !note.data) return null;

  const baseMime = typeof note.mime === "string" ? note.mime.split(";")[0].trim() : "";
  const extension = VOICE_NOTE_EXTENSIONS[baseMime];
  if (!extension) {
    console.error("Rejected voice note with unsupported mime:", baseMime);
    return null;
  }

  let bytes: Uint8Array;
  try {
    const binary = atob(note.data);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  } catch (err) {
    console.error("Voice note base64 decode failed:", String(err));
    return null;
  }

  if (bytes.length === 0 || bytes.length > MAX_VOICE_NOTE_BYTES) {
    console.error("Rejected voice note of size:", bytes.length);
    return null;
  }

  const path = `web/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(VOICE_NOTE_BUCKET)
    .upload(path, new Blob([bytes], { type: baseMime }), {
      contentType: baseMime,
      upsert: false,
    });

  if (error) {
    console.error("Voice note upload failed:", JSON.stringify(error));
    return null;
  }

  return path;
}

/**
 * Malaysia runs UTC+8 year round, so "today" is evaluated in local time.
 * Judging against UTC would reject a same-day report filed before 8am.
 */
function isFutureDate(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const nowMyt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const todayMyt = nowMyt.toISOString().slice(0, 10);
  return isoDate > todayMyt;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type WebPayload = {
  honeypot?: string;
  turnstile_token?: string;
  category?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  address_text?: string | null;
  name?: string | null;
  contact_number?: string | null;
  agency?: string | null;
  agency_ref?: string | null;
  agency_reported_at?: string | null;
  language?: string | null;
  voice_note?: { mime?: string; data?: string; duration_ms?: number } | null;
};

type ResolvedLocation = {
  latitude: number | null;
  longitude: number | null;
  location_source: "pin" | "geocoded" | null;
  address_text: string | null;
};

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".pages.dev");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

function fakeTicketNumber(): string {
  const ym = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "2-digit",
    month: "2-digit",
  }).replace("/", "");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `ADU-${ym}-${seq}`;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return Number.NaN;
}

function inJohor(lat: number, lng: number): boolean {
  return (
    lat >= JOHOR_LAT_MIN && lat <= JOHOR_LAT_MAX &&
    lng >= JOHOR_LNG_MIN && lng <= JOHOR_LNG_MAX
  );
}

async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number; displayName: string } | null> {
  try {
    const { data: waitMs, error: reserveError } = await supabase.rpc("reserve_nominatim_slot");
    if (reserveError) {
      console.error("Nominatim slot reservation failed:", JSON.stringify(reserveError));
    } else if (typeof waitMs === "number" && waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const params = new URLSearchParams({
      q: `${address}, Johor, Malaysia`,
      format: "jsonv2",
      limit: "1",
      addressdetails: "1",
      countrycodes: "my",
      viewbox: "102.4,2.8,104.8,1.2",
      bounded: "0",
      email: "admin@sahkan.my",
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: {
          "User-Agent": "SahkanAduanWeb/1.0 (https://aduan.sahkan.my; contact: admin@sahkan.my)",
          Accept: "application/json",
          "Accept-Language": "ms,en",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        console.error("Nominatim geocode failed:", response.status, await response.text());
        return null;
      }

      const results = await response.json();
      const first = Array.isArray(results) ? results[0] : null;
      const latitude = Number(first?.lat);
      const longitude = Number(first?.lon);
      if (!first?.display_name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }
      return { latitude, longitude, displayName: first.display_name };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error("Nominatim geocode error:", error);
    return null;
  }
}

type LocationResult =
  | { ok: true; value: ResolvedLocation }
  | { ok: false; error: string };

async function resolveLocation(body: WebPayload): Promise<LocationResult> {
  const addressText =
    typeof body.address_text === "string" && body.address_text.trim()
      ? body.address_text.trim()
      : null;

  const latitude = parseOptionalNumber(body.latitude);
  const longitude = parseOptionalNumber(body.longitude);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { ok: false, error: "Latitude and longitude must be valid numbers" };
  }

  const hasLat = latitude != null;
  const hasLng = longitude != null;
  if (hasLat !== hasLng) {
    return {
      ok: false,
      error: "Latitude and longitude must both be present or both be absent",
    };
  }

  if (hasLat && hasLng) {
    if (
      latitude! < MY_LAT_MIN || latitude! > MY_LAT_MAX ||
      longitude! < MY_LNG_MIN || longitude! > MY_LNG_MAX
    ) {
      return { ok: false, error: "Coordinates must be within Malaysia" };
    }
    return {
      ok: true,
      value: {
        latitude: latitude!,
        longitude: longitude!,
        location_source: "pin",
        address_text: addressText,
      },
    };
  }

  // No pin: try geocoding address_text. Never fail the submission on geocode miss.
  if (addressText) {
    const geocoded = await geocodeAddress(addressText);
    if (geocoded && inJohor(geocoded.latitude, geocoded.longitude)) {
      return {
        ok: true,
        value: {
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
          location_source: "geocoded",
          address_text: geocoded.displayName,
        },
      };
    }
  }

  return {
    ok: true,
    value: {
      latitude: null,
      longitude: null,
      location_source: null,
      address_text: addressText,
    },
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ error: "Origin not allowed" }, 403, origin);
  }

  let body: WebPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, origin);
  }

  if (typeof body.honeypot === "string" && body.honeypot.trim() !== "") {
    return jsonResponse({ ticket_number: fakeTicketNumber(), status: "baru" }, 200, origin);
  }

  const remoteIp =
    req.headers.get("CF-Connecting-IP")?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    "";

  const turnstileToken = typeof body.turnstile_token === "string" ? body.turnstile_token.trim() : "";
  if (!turnstileToken) {
    return jsonResponse({ error: "Turnstile token is required" }, 400, origin);
  }

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!turnstileSecret) {
    console.error("TURNSTILE_SECRET_KEY is not set");
    return jsonResponse({ error: "Server misconfigured" }, 500, origin);
  }

  const verifyForm = new FormData();
  verifyForm.append("secret", turnstileSecret);
  verifyForm.append("response", turnstileToken);
  if (remoteIp) verifyForm.append("remoteip", remoteIp);

  const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: verifyForm,
  });
  if (!turnstileRes.ok) {
    console.error("Turnstile siteverify HTTP error:", turnstileRes.status);
    return jsonResponse({ error: "Turnstile verification failed" }, 403, origin);
  }
  const turnstileJson = await turnstileRes.json();
  if (!turnstileJson?.success) {
    return jsonResponse({ error: "Turnstile verification failed" }, 403, origin);
  }

  const ipForHash = remoteIp || "unknown";
  const ipHash = await sha256Hex(ipForHash);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("web_submission_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", oneHourAgo);

  if (countError) {
    console.error("web_submission_log count failed:", JSON.stringify(countError));
    return jsonResponse({ error: "Unable to check rate limit" }, 500, origin);
  }
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return jsonResponse({ error: "Too many submissions. Please try again later." }, 429, origin);
  }

  const { error: logError } = await supabase
    .from("web_submission_log")
    .insert({ ip_hash: ipHash });
  if (logError) {
    console.error("web_submission_log insert failed:", JSON.stringify(logError));
    return jsonResponse({ error: "Unable to record submission" }, 500, origin);
  }

  const category = typeof body.category === "string" ? body.category.trim() : "";
  if (!VALID_CATEGORIES.has(category)) {
    return jsonResponse({ error: "Invalid category" }, 400, origin);
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return jsonResponse({ error: "Description is required" }, 400, origin);
  }
  if (description.length > 2000) {
    return jsonResponse({ error: "Description must be 2000 characters or fewer" }, 400, origin);
  }

  const location = await resolveLocation(body);
  if (!location.ok) {
    return jsonResponse({ error: location.error }, 400, origin);
  }
  const resolved = location.value;

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
  const contactNumber =
    typeof body.contact_number === "string" && body.contact_number.trim()
      ? body.contact_number.trim()
      : null;
  const agency = typeof body.agency === "string" && body.agency.trim() ? body.agency.trim() : null;
  const agencyRef =
    typeof body.agency_ref === "string" && body.agency_ref.trim()
      ? body.agency_ref.trim()
      : null;
  const agencyReportedAt =
    typeof body.agency_reported_at === "string" && body.agency_reported_at.trim()
      ? body.agency_reported_at.trim()
      : null;
  if (agencyReportedAt && isFutureDate(agencyReportedAt)) {
    return jsonResponse({ error: "Agency report date cannot be in the future" }, 400, origin);
  }

  const language =
    typeof body.language === "string" && VALID_LANGUAGES.has(body.language)
      ? body.language
      : "ms";

  const voiceNotePath = await storeVoiceNote(body.voice_note);

  const { data: ticket, error: rpcError } = await supabase.rpc("create_or_link_ticket", {
    p_category: category,
    p_description: description,
    p_latitude: resolved.latitude,
    p_longitude: resolved.longitude,
    p_location_source: resolved.location_source,
    p_address_text: resolved.address_text,
    p_source: "web",
    p_consent_given_at: new Date().toISOString(),
    p_consent_version: CONSENT_VERSION,
    p_name: name,
    p_contact_number: contactNumber,
    p_agency: agency,
    p_agency_ref: agencyRef,
    p_agency_reported_at: agencyReportedAt,
    p_language: language,
    p_voice_note_url: voiceNotePath,
  });

  if (rpcError || !ticket) {
    console.error("create_or_link_ticket failed:", JSON.stringify(rpcError));
    return jsonResponse({ error: "Unable to save complaint" }, 500, origin);
  }

  return jsonResponse(
    {
      ticket_number: ticket.ticket_number,
      status: ticket.status,
    },
    200,
    origin,
  );
});
