import { getState, setState, uid, type ActiveWorkout, type Session, type SwimEntry } from '../store';
import { setsFor, suggest, weekInfo } from './plan';

export function startWorkout() {
  const { plan, pointer, history, active } = getState();
  if (!plan || active) return;
  const day = plan.days[pointer.dayIndex % plan.days.length];
  const { deload } = weekInfo(plan, pointer.week);
  const workout: ActiveWorkout = {
    id: uid(),
    start: Date.now(),
    week: pointer.week,
    dayIndex: pointer.dayIndex,
    dayKey: day.key,
    exercises: day.slots.map((slot) => {
      const s = suggest(history, slot, deload);
      const n = setsFor(slot, plan, pointer.week);
      return {
        exId: slot.exId,
        reps: slot.reps,
        rest: slot.rest,
        sets: Array.from({ length: n }, () => ({ w: s.w, r: s.r, done: false })),
      };
    }),
  };
  setState({ active: workout });
}

export function updateActive(fn: (w: ActiveWorkout) => ActiveWorkout) {
  const { active } = getState();
  if (active) setState({ active: fn(active) });
}

export function discardWorkout() {
  setState({ active: null });
}

export function finishWorkout(): Session | null {
  const { active, plan, pointer, history } = getState();
  if (!active || !plan) return null;
  const session: Session = {
    id: active.id,
    start: active.start,
    end: Date.now(),
    week: active.week,
    dayKey: active.dayKey,
    exercises: active.exercises
      .map((e) => ({ exId: e.exId, sets: e.sets.filter((s) => s.done).map(({ w, r }) => ({ w, r })) }))
      .filter((e) => e.sets.length > 0),
    swims: active.swims?.length ? active.swims : undefined,
  };
  let { week, dayIndex } = pointer;
  dayIndex += 1;
  if (dayIndex >= plan.days.length) { dayIndex = 0; week += 1; }
  setState({ active: null, history: [...history, session], pointer: { week, dayIndex } });
  return session;
}

export function updateSession(id: string, patch: Partial<Session>) {
  setState((s) => ({ history: s.history.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
}

export const sessionVolume = (s: Session) =>
  s.exercises.reduce((sum, e) => sum + e.sets.reduce((a, x) => a + x.w * x.r, 0), 0);
export const sessionSets = (s: Session) => s.exercises.reduce((sum, e) => sum + e.sets.length, 0);

/** A standalone swim — logged as its own session; does not advance the lifting plan. */
export function logSwim(entry: SwimEntry, end = Date.now()): Session {
  const { pointer, history } = getState();
  const session: Session = {
    id: uid(),
    start: end - entry.duration * 1000,
    end,
    week: pointer.week,
    dayKey: 'swim',
    exercises: [],
    swims: [entry],
  };
  setState({ history: [...history, session].sort((a, b) => a.start - b.start) });
  return session;
}

export function logBodyweight(kg: number) {
  setState((s) => ({ bodyweight: [...s.bodyweight, { date: Date.now(), kg }] }));
}

export const swimDistance = (s: Session) => (s.swims ?? []).reduce((d, x) => d + x.distance, 0);
/** Seconds per 100 m */
export const pace = (e: SwimEntry) => (e.distance ? (e.duration / e.distance) * 100 : 0);
export const fmtPace = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
