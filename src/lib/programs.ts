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

const MASS16: Record<string, Item[]> = {
  massA: [
    ['bird_dog', 'birddog'], ['squat', 'main'], ['hip_thrust', 'thrust'],
    ['bench_press', 'main', true], ['lat_pulldown', 'main'],
    ['leg_curl', 'acc', true], ['cable_fly', 'pump'],
    ['db_shoulder_press', 'acc', true], ['cable_row', 'acc'],
    ['lateral_raise', 'pump'],
    ['db_curl', 'acc', true], ['pushdown', 'acc'],
  ],
  massB: [
    ['dead_bug', 'deadbug'], ['rdl', 'main'], ['back_extension', 'backext'], ['bulgarian', 'acc'],
    ['incline_db_press', 'main', true], ['barbell_row', 'main'],
    ['pull_up', 'pullup', true], ['push_up', 'pushup'],
    ['ohp', 'acc'], ['face_pull', 'pump'],
    ['hammer_curl', 'acc', true], ['overhead_ext', 'acc'],
  ],
  massC: [
    ['plank', 'plank'], ['leg_press', 'main'], ['single_leg_rdl', 'acc'], ['glute_bridge', 'bridge'],
    ['db_bench', 'main', true], ['db_row', 'main'],
    ['db_fly', 'pump', true], ['lat_pulldown', 'acc', false, { he: 'אחיזה צרה, כפות כלפי הפנים', en: 'Close grip, palms facing you' }],
    ['lateral_raise', 'pump', true], ['face_pull', 'pump'],
    ['barbell_curl', 'acc', true], ['skull_crusher', 'acc'],
  ],
};

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
