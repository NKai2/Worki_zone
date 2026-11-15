import type { Text } from '../data/types';
import type { Plan, Slot } from '../store';
import { uid } from '../store';
import { patternOf } from './plan';

/*
 * Built-in programs. Prescriptions are [sets, minReps, maxReps] per 4-week block
 * (weeks 1-4, 5-8, 9-12, 13-16); every 4th week is a deload handled by weekInfo().
 */

type Rx = [number, number, number][];
const RX: Record<string, { rx: Rx; rest: number; notes?: (Text | null)[] }> = {
  main: { rx: [[3, 10, 12], [3, 8, 12], [4, 6, 8], [3, 8, 10]], rest: 150,
    notes: [null, null, null, { he: '+ סט אחרון של 12-15 במשקל נמוך ב-20%', en: '+ one last set of 12-15 at 20% less weight' }] },
  acc: { rx: [[2, 12, 15], [3, 10, 12], [3, 8, 12], [3, 12, 15]], rest: 80 },
  pump: { rx: [[2, 12, 15], [3, 12, 15], [3, 12, 15], [3, 15, 20]], rest: 60 },
  thrust: { rx: [[3, 12, 12], [3, 10, 12], [4, 8, 10], [3, 10, 12]], rest: 120,
    notes: [null, null, null, { he: 'עצירה של 2 שניות למעלה', en: 'Pause 2 s at the top' }] },
  backext: { rx: [[2, 12, 12], [3, 12, 15], [3, 10, 12], [3, 12, 15]], rest: 90,
    notes: [{ he: 'משקל גוף', en: 'Bodyweight' }, { he: 'משקל גוף', en: 'Bodyweight' }, { he: 'עם 5-10 ק״ג', en: 'Holding 5-10 kg' }, { he: 'עם 10-15 ק״ג', en: 'Holding 10-15 kg' }] },
  bridge: { rx: [[3, 12, 12], [3, 10, 10], [3, 12, 12], [3, 12, 12]], rest: 75,
    notes: [{ he: 'שתי רגליים', en: 'Both legs' }, { he: 'לכל רגל', en: 'Per leg' }, { he: 'לכל רגל', en: 'Per leg' }, { he: 'לכל רגל, עם משקולת', en: 'Per leg, with a weight' }] },
  birddog: { rx: [[3, 5, 5], [3, 6, 6], [3, 8, 8], [3, 8, 8]], rest: 30,
    notes: [{ he: 'לכל צד · החזקה 6 ש׳', en: 'Per side · hold 6 s' }, { he: 'לכל צד · החזקה 8 ש׳', en: 'Per side · hold 8 s' }, { he: 'לכל צד · החזקה 8 ש׳', en: 'Per side · hold 8 s' }, { he: 'לכל צד · החזקה 10 ש׳', en: 'Per side · hold 10 s' }] },
  deadbug: { rx: [[3, 6, 6], [3, 8, 8], [3, 10, 10], [3, 10, 10]], rest: 30,
    notes: [{ he: 'לכל צד', en: 'Per side' }, { he: 'לכל צד', en: 'Per side' }, { he: 'לכל צד', en: 'Per side' }, { he: 'לכל צד, משקולת 2 ק״ג ביד', en: 'Per side, 2 kg in the hand' }] },
  plank: { rx: [[3, 30, 30], [3, 40, 40], [3, 25, 25], [3, 35, 35]], rest: 45,
    notes: [null, null, { he: 'פלאנק צד — לכל צד', en: 'Side plank — per side' }, { he: 'פלאנק צד — לכל צד', en: 'Side plank — per side' }] },
  pullup: { rx: [[3, 5, 8], [3, 6, 10], [4, 5, 8], [3, 8, 10]], rest: 120,
    notes: [{ he: 'עם גומייה אם צריך', en: 'Use a band if needed' }, null, null, null] },
  pushup: { rx: [[2, 10, 15], [3, 12, 20], [3, 12, 15], [3, 15, 20]], rest: 90,
    notes: [null, null, { he: 'רגליים מוגבהות על ספסל', en: 'Feet raised on a bench' }, null] },
};

type Item = [exId: string, rx: keyof typeof RX, pairWithNext?: boolean, note?: Text];

/*
 * Session order follows the usual rules for full-body hypertrophy work:
 *   1. the heaviest lower-body compound first, while fresh
 *   2. alternate upper / lower blocks so each area recovers while the other works
 *   3. supersets only pair opposing, non-competing muscles (push + pull, biceps + triceps)
 *   4. never two lower-back-loading exercises back to back
 *   5. isolation work after compounds, smaller muscles last
 *   6. core-stability work at the end, so the spinal stabilisers are fresh for squats and hinges
 */
const MASS16: Record<string, Item[]> = {
  massA: [
    ['squat', 'main'],
    ['bench_press', 'main', true], ['lat_pulldown', 'main'],
    ['hip_thrust', 'thrust'],
    ['db_shoulder_press', 'acc', true], ['cable_row', 'acc'],
    ['leg_curl', 'acc', true], ['cable_fly', 'pump'],
    ['lateral_raise', 'pump'],
    ['db_curl', 'acc', true], ['pushdown', 'acc'],
    ['bird_dog', 'birddog'],
  ],
  massB: [
    ['rdl', 'main'],
    ['incline_db_press', 'main', true], ['pull_up', 'pullup'],
    ['bulgarian', 'acc'],
    ['barbell_row', 'main', true], ['push_up', 'pushup'],
    ['ohp', 'acc', true], ['face_pull', 'pump'],
    ['back_extension', 'backext'],
    ['hammer_curl', 'acc', true], ['overhead_ext', 'acc'],
    ['dead_bug', 'deadbug'],
  ],
  massC: [
    ['leg_press', 'main'],
    ['db_bench', 'main', true], ['db_row', 'main'],
    ['single_leg_rdl', 'acc'],
    ['db_fly', 'pump', true], ['lat_pulldown', 'acc', false, { he: 'אחיזה צרה, כפות כלפי הפנים', en: 'Close grip, palms facing you' }],
    ['glute_bridge', 'bridge'],
    ['lateral_raise', 'pump', true], ['face_pull', 'pump'],
    ['barbell_curl', 'acc', true], ['skull_crusher', 'acc'],
    ['plank', 'plank'],
  ],
};

/** Exercise order of the first release, used to re-order plans saved before revision 2. */
const MASS16_V1: Record<string, string[]> = {
  massA: ['bird_dog', 'squat', 'hip_thrust', 'bench_press', 'lat_pulldown', 'leg_curl', 'cable_fly', 'db_shoulder_press', 'cable_row', 'lateral_raise', 'db_curl', 'pushdown'],
  massB: ['dead_bug', 'rdl', 'back_extension', 'bulgarian', 'incline_db_press', 'barbell_row', 'pull_up', 'push_up', 'ohp', 'face_pull', 'hammer_curl', 'overhead_ext'],
  massC: ['plank', 'leg_press', 'single_leg_rdl', 'glute_bridge', 'db_bench', 'db_row', 'db_fly', 'lat_pulldown', 'lateral_raise', 'face_pull', 'barbell_curl', 'skull_crusher'],
};
const MASS16_REV = 2;

/**
 * Bring a saved program plan up to the current revision without losing the user's changes:
 * slots keep their swaps and set edits, they only move to their new position.
 */
export function migratePlan(plan: Plan): Plan | null {
  if (plan.program !== 'mass16' || (plan.rev ?? 1) >= MASS16_REV) return null;
  const days = plan.days.map((d) => {
    const oldIds = MASS16_V1[d.key], items = MASS16[d.key];
    if (!oldIds || !items) return d;
    const newIds = items.map((it) => it[0]);
    const placed: Slot[] = new Array(newIds.length);
    const extra: Slot[] = [];
    d.slots.forEach((slot, i) => {
      const k = i < oldIds.length ? newIds.indexOf(oldIds[i]) : -1;
      if (k >= 0 && !placed[k]) placed[k] = { ...slot, pair: items[k][2] };
      else extra.push({ ...slot, pair: false });
    });
    return { ...d, slots: [...placed.filter(Boolean), ...extra] };
  });
  return { ...plan, days, rev: MASS16_REV };
}

export const PROGRAMS = {
  mass16: {
    name: { he: 'תוכנית מסה · 16 שבועות', en: 'Mass program · 16 weeks' },
    sub: { he: '3 אימוני פול באדי בשבוע · דגש אגן וגב תחתון', en: '3 full-body sessions a week · pelvis & lower-back focus' },
    weeks: 16,
    days: MASS16,
  },
};
export type ProgramId = keyof typeof PROGRAMS;

export function buildProgram(id: ProgramId): Plan {
  const p = PROGRAMS[id];
  return {
    id: uid(),
    createdAt: Date.now(),
    weeks: p.weeks,
    program: id,
    rev: MASS16_REV,
    days: Object.entries(p.days).map(([key, items]) => ({
      key,
      slots: items.map(([exId, rxKey, pair, note]): Slot => {
        const r = RX[rxKey];
        return {
          exId,
          pattern: patternOf(exId),
          sets: r.rx[0][0],
          reps: [r.rx[0][1], r.rx[0][2]],
          rest: r.rest,
          blocks: r.rx,
          notes: note ? r.rx.map((_, i) => (r.notes?.[i] ? { he: `${note.he} · ${r.notes[i]!.he}`, en: `${note.en} · ${r.notes[i]!.en}` } : note)) : r.notes,
          pair,
        };
      }),
    })),
  };
}

/** Install a program as the active plan, starting at week 1. Keeps history and settings. */
export function installProgram(id: ProgramId) {
  // imported lazily to keep this module free of store side effects at load time
  return import('../store').then(({ getState, setState }) => {
    const s = getState();
    setState({
      plan: buildProgram(id),
      pointer: { week: 1, dayIndex: 0 },
      active: null,
      profile: s.profile ?? { experience: 'intermediate', days: 3, minutes: 75, equipment: ['barbell', 'dumbbell', 'machine', 'cable', 'bench', 'pullup'] },
    });
  });
}

export const programLink = (id: ProgramId) => `${location.origin}${location.pathname}?program=${id}`;
