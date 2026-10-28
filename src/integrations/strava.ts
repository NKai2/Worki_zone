import { EX } from '../data/exercises';
import { getState, updateSettings, type Session, type StravaAuth } from '../store';

const AUTH_URL = 'https://www.strava.com/oauth/authorize';
const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API = 'https://www.strava.com/api/v3';

export const redirectUri = () => location.origin + location.pathname;

export function connectStrava() {
  const { stravaClientId } = getState().settings;
  const params = new URLSearchParams({
    client_id: stravaClientId.trim(),
    response_type: 'code',
    redirect_uri: redirectUri(),
    approval_prompt: 'auto',
    scope: 'read,activity:write',
    state: 'strava',
  });
  location.href = `${AUTH_URL}?${params}`;
}

async function tokenRequest(body: Record<string, string>): Promise<StravaAuth> {
  const { stravaClientId, stravaSecret } = getState().settings;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: stravaClientId.trim(), client_secret: stravaSecret.trim(), ...body }),
  });
  if (!res.ok) throw new Error(`Strava auth failed (${res.status})`);
  const j = await res.json();
  const prev = getState().settings.strava;
  return {
    access: j.access_token,
    refresh: j.refresh_token,
    expires: j.expires_at,
    athlete: j.athlete ? `${j.athlete.firstname ?? ''} ${j.athlete.lastname ?? ''}`.trim() : prev?.athlete,
  };
}

/** Call on app start: finishes the OAuth redirect if Strava sent us back with a code. */
export async function handleStravaRedirect(): Promise<boolean> {
  const q = new URLSearchParams(location.search);
  if (q.get('state') !== 'strava') return false;
  const code = q.get('code');
  history.replaceState(null, '', redirectUri() + location.hash);
  if (!code) return false;
  const auth = await tokenRequest({ code, grant_type: 'authorization_code' });
  updateSettings({ strava: auth });
  return true;
}

async function accessToken(): Promise<string> {
  const auth = getState().settings.strava;
  if (!auth) throw new Error('Strava not connected');
  if (auth.expires * 1000 > Date.now() + 60_000) return auth.access;
  const next = await tokenRequest({ refresh_token: auth.refresh, grant_type: 'refresh_token' });
  updateSettings({ strava: next });
  return next.access;
}

function localIso(ms: number) {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 19);
}

export function describe(s: Session) {
  const lines = s.exercises.map((e) => `${EX[e.exId]?.name.en ?? e.exId}: ${e.sets.map((x) => (x.w ? `${x.w}kg×${x.r}` : `${x.r}`)).join(', ')}`);
  for (const w of s.swims ?? []) lines.push(`Swim: ${w.distance} m ${w.stroke} in ${Math.round(w.duration / 60)} min`);
  return lines.join('\n') + '\n\nLogged with Worki Zone';
}

export async function uploadToStrava(s: Session, name: string): Promise<number> {
  const token = await accessToken();
  const swimOnly = s.exercises.length === 0 && !!s.swims?.length;
  const distance = (s.swims ?? []).reduce((d, x) => d + x.distance, 0);
  const res = await fetch(`${API}/activities`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      name,
      sport_type: swimOnly ? 'Swim' : 'WeightTraining',
      type: swimOnly ? 'Swim' : 'WeightTraining',
      ...(swimOnly ? { distance: String(distance) } : {}),
      start_date_local: localIso(s.start),
      elapsed_time: String(Math.max(60, Math.round((s.end - s.start) / 1000))),
      description: describe(s),
      ...(swimOnly ? {} : { trainer: '1' }),
    }),
  });
  if (!res.ok) throw new Error(`Strava upload failed (${res.status})`);
  const j = await res.json();
  return j.id as number;
}
