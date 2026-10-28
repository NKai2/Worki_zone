import { useSyncExternalStore } from 'react';
import type { Equip, Lang, Pattern } from './data/types';

export type Experience = 'beginner' | 'intermediate' | 'advanced';

export interface Profile {
  experience: Experience;
  days: number;
  minutes: number;
  equipment: Equip[];
}

export interface Slot {
  exId: string;
  pattern: Pattern;
  sets: number;
  reps: [number, number];
  rest: number;
}

export interface DayPlan {
  key: string;
  slots: Slot[];
}

export interface Plan {
  id: string;
  createdAt: number;
  weeks: number;
  days: DayPlan[];
}

export interface LoggedSet { w: number; r: number; done: boolean }
export interface LoggedExercise { exId: string; sets: LoggedSet[]; reps: [number, number]; rest: number }

export interface ActiveWorkout {
  id: string;
  start: number;
  week: number;
  dayIndex: number;
  dayKey: string;
  exercises: LoggedExercise[];
}

export interface Session {
  id: string;
  start: number;
  end: number;
  week: number;
  dayKey: string;
  exercises: { exId: string; sets: { w: number; r: number }[] }[];
  stravaId?: number;
}

export interface StravaAuth { access: string; refresh: string; expires: number; athlete?: string }

export interface Settings {
  lang: Lang;
  restSound: boolean;
  stravaClientId: string;
  stravaSecret: string;
  strava?: StravaAuth;
  autoStrava: boolean;
}

export interface State {
  version: 1;
  profile: Profile | null;
  plan: Plan | null;
  pointer: { week: number; dayIndex: number };
  active: ActiveWorkout | null;
  history: Session[];
  bodyweight: { date: number; kg: number }[];
  settings: Settings;
}

const KEY = 'worki-zone:v1';

const initial: State = {
  version: 1,
  profile: null,
  plan: null,
  pointer: { week: 1, dayIndex: 0 },
  active: null,
  history: [],
  bodyweight: [],
  settings: { lang: 'he', restSound: true, stravaClientId: '', stravaSecret: '', autoStrava: false },
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    const data = JSON.parse(raw) as Partial<State>;
    return { ...initial, ...data, settings: { ...initial.settings, ...data.settings } };
  } catch {
    return initial;
  }
}

let state: State = load();
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(update: Partial<State> | ((s: State) => Partial<State>)) {
  const patch = typeof update === 'function' ? update(state) : update;
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — keep in memory */
  }
  listeners.forEach((l) => l());
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ settings: { ...s.settings, ...patch } }));
}

export function replaceState(next: State) {
  setState({ ...initial, ...next, settings: { ...initial.settings, ...next.settings } });
}

export function resetState() {
  setState({ ...initial, settings: { ...initial.settings, lang: state.settings.lang } });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
