import { getState, setState, uid, type ActiveWorkout, type Session } from '../store';
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
