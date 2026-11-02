import "server-only";
import { deleteSetting, getSetting, setSetting } from "../settings";

// Calendar sync. Pages and actions only talk to this interface.
//   GoogleCalendarProvider when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set.
//     The owner connects their account once from Settings (OAuth); confirmed
//     shoots become events, and busy time on their calendar is hidden from
//     the booking form.
//   NoCalendarProvider otherwise.

export interface CalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
}

export interface CalendarProvider {
  readonly name: "google" | "none";
  /** Keys are configured (the owner may still need to connect). */
  readonly configured: boolean;
  isConnected(): Promise<boolean>;
  connectedAccount(): Promise<string | null>;
  createEvent(input: CalendarEventInput): Promise<string | null>;
  updateEvent(eventId: string, input: Partial<CalendarEventInput>): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  getBusy(from: Date, to: Date): Promise<{ start: string; end: string }[]>;
}

interface GoogleTokens {
  refreshToken: string;
  accessToken?: string;
  expiresAt?: number;
  email?: string;
}

const TOKEN_KEY = "google_calendar";
const API = "https://www.googleapis.com/calendar/v3";
export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.freebusy", "openid", "email"];

export function googleRedirectUri() {
  return `${process.env.APP_URL ?? "http://localhost:3000"}/api/google/callback`;
}

export function googleAuthUrl(state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES.join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

/** Exchange the OAuth code and store the refresh token. */
export async function completeGoogleConnect(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const json = (await res.json()) as { refresh_token?: string; access_token?: string; expires_in?: number; id_token?: string; error?: string };
  if (!res.ok || !json.refresh_token) throw new Error(json.error ?? "Google did not return a refresh token");
  let email: string | undefined;
  if (json.id_token) {
    try {
      email = JSON.parse(Buffer.from(json.id_token.split(".")[1], "base64url").toString()).email;
    } catch {}
  }
  await setSetting(TOKEN_KEY, {
    refreshToken: json.refresh_token,
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 0) * 1000,
    email,
  } satisfies GoogleTokens);
}

export async function disconnectGoogle() {
  await deleteSetting(TOKEN_KEY);
}

class GoogleCalendarProvider implements CalendarProvider {
  readonly name = "google" as const;
  readonly configured = true;
  private calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");

  private async token(): Promise<string | null> {
    const t = await getSetting<GoogleTokens>(TOKEN_KEY);
    if (!t) return null;
    if (t.accessToken && t.expiresAt && t.expiresAt > Date.now() + 60_000) return t.accessToken;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: t.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      console.error("Google token refresh failed", res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    await setSetting(TOKEN_KEY, { ...t, accessToken: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 });
    return json.access_token;
  }

  private async call(path: string, init: RequestInit = {}) {
    const token = await this.token();
    if (!token) return null;
    const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers } });
    if (!res.ok && res.status !== 410 && res.status !== 404) {
      console.error("Google Calendar error", res.status, await res.text());
      return null;
    }
    return res.status === 204 || res.status === 410 || res.status === 404 ? {} : res.json();
  }

  async isConnected() {
    return !!(await getSetting<GoogleTokens>(TOKEN_KEY));
  }
  async connectedAccount() {
    return (await getSetting<GoogleTokens>(TOKEN_KEY))?.email ?? null;
  }
  private body(i: Partial<CalendarEventInput>) {
    return JSON.stringify({
      ...(i.title && { summary: i.title }),
      ...(i.description !== undefined && { description: i.description }),
      ...(i.location && { location: i.location }),
      ...(i.start && { start: { dateTime: i.start } }),
      ...(i.end && { end: { dateTime: i.end } }),
    });
  }
  async createEvent(input: CalendarEventInput) {
    const json = (await this.call(`/calendars/${this.calendarId}/events`, { method: "POST", body: this.body(input) })) as { id?: string } | null;
    return json?.id ?? null;
  }
  async updateEvent(eventId: string, input: Partial<CalendarEventInput>) {
    await this.call(`/calendars/${this.calendarId}/events/${encodeURIComponent(eventId)}`, { method: "PATCH", body: this.body(input) });
  }
  async deleteEvent(eventId: string) {
    await this.call(`/calendars/${this.calendarId}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
  }
  async getBusy(from: Date, to: Date) {
    const id = decodeURIComponent(this.calendarId);
    const json = (await this.call(`/freeBusy`, {
      method: "POST",
      body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id }] }),
    })) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> } | null;
    return json?.calendars?.[id]?.busy ?? [];
  }
}

class NoCalendarProvider implements CalendarProvider {
  readonly name = "none" as const;
  readonly configured = false;
  async isConnected() {
    return false;
  }
  async connectedAccount() {
    return null;
  }
  async createEvent() {
    return null;
  }
  async updateEvent() {}
  async deleteEvent() {}
  async getBusy() {
    return [];
  }
}

export function createCalendar(): CalendarProvider {
  return process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? new GoogleCalendarProvider() : new NoCalendarProvider();
}
