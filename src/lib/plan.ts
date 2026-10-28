import { EX, EXERCISES } from '../data/exercises';
import type { Equip, Exercise, Muscle, Pattern } from '../data/types';
import type { DayPlan, Plan, Profile, Session, Slot } from '../store';
import { uid } from '../store';

/** Candidate exercises per movement pattern, in order of preference. */
const CANDIDATES: Record<Pattern, string[]> = {
  squat: ['squat', 'leg_press', 'goblet_squat', 'bw_squat'],
  hinge: ['rdl', 'db_rdl', 'deadlift', 'glute_bridge'],
  glute: ['hip_thrust', 'glute_bridge'],
  lunge: ['bulgarian', 'split_squat'],
  quadIso: ['leg_extension', 'bulgarian', 'split_squat'],
  hamIso: ['leg_curl', 'db_rdl', 'glute_bridge'],
  calf: ['calf_raise'],
  hPush: ['bench_press', 'db_bench', 'chest_press', 'push_up'],
  iPush: ['incline_db_press', 'chest_press', 'push_up'],
  vPush: ['ohp', 'db_shoulder_press', 'pike_push_up'],
  chestIso: ['cable_fly', 'db_fly', 'push_up'],
  vPull: ['lat_pulldown', 'pull_up', 'inverted_row'],
  hPull: ['barbell_row', 'cable_row', 'db_row', 'inverted_row'],
  latDelt: ['lateral_raise'],
  rearDelt: ['face_pull', 'inverted_row'],
  biceps: ['db_curl', 'barbell_curl', 'cable_curl', 'hammer_curl'],
  triceps: ['pushdown', 'overhead_ext', 'skull_crusher', 'bench_dip'],
  core: ['hanging_leg_raise', 'leg_raise', 'crunch', 'plank'],
};

type T = [Pattern, number];

/** Day templates — slots are ordered by priority so shorter sessions trim from the end. */
const DAYS: Record<string, T[]> = {
  fbA: [['squat', 0], ['hPush', 0], ['hPull', 0], ['hamIso', 0], ['latDelt', 0], ['biceps', 0], ['calf', 0], ['core', 0]],
  fbB: [['hinge', 0], ['iPush', 0], ['vPull', 0], ['lunge', 0], ['latDelt', 0], ['triceps', 0], ['core', 1]],
  fbC: [['squat', 1], ['hPush', 1], ['hPull', 1], ['glute', 0], ['rearDelt', 0], ['biceps', 1], ['triceps', 1]],
  upA: [['hPush', 0], ['hPull', 0], ['vPush', 0], ['vPull', 0], ['latDelt', 0], ['biceps', 0], ['triceps', 0]],
  upB: [['iPush', 0], ['vPull', 1], ['hPull', 1], ['chestIso', 0], ['latDelt', 0], ['rearDelt', 0], ['biceps', 1], ['triceps', 1]],
  loA: [['squat', 0], ['hinge', 0], ['quadIso', 0], ['hamIso', 0], ['calf', 0], ['core', 0]],
  loB: [['hinge', 1], ['lunge', 0], ['squat', 1], ['hamIso', 0], ['glute', 0], ['calf', 0], ['core', 1]],
  push: [['hPush', 0], ['iPush', 0], ['vPush', 0], ['chestIso', 0], ['latDelt', 0], ['triceps', 0], ['triceps', 1]],
  pull: [['vPull', 0], ['hPull', 0], ['hPull', 1], ['rearDelt', 0], ['biceps', 0], ['biceps', 1], ['core', 0]],
  legs: [['squat', 0], ['hinge', 0], ['lunge', 0], ['quadIso', 0], ['hamIso', 0], ['calf', 0]],
};

const SPLITS: Record<number, [string, number][]> = {
  2: [['fbA', 0], ['fbB', 0]],
  3: [['fbA', 0], ['fbB', 0], ['fbC', 0]],
  4: [['upA', 0], ['loA', 0], ['upB', 0], ['loB', 0]],
  5: [['upA', 0], ['loA', 0], ['push', 1], ['pull', 1], ['legs', 1]],
  6: [['push', 0], ['pull', 0], ['legs', 0], ['push', 1], ['pull', 1], ['legs', 1]],
};

const MAX_EXERCISES: Record<number, number> = { 45: 5, 60: 6, 75: 7, 90: 8 };

export const available = (ex: Exercise, equip: Equip[]) => ex.equip.every((e) => equip.includes(e));

export const patternOf = (exId: string): Pattern =>
  (Object.keys(CANDIDATES) as Pattern[]).find((p) => CANDIDATES[p].includes(exId)) ?? 'core';

export function candidatesFor(pattern: Pattern, equip: Equip[]): Exercise[] {
  return CANDIDATES[pattern].map((id) => EX[id]).filter((e) => available(e, equip));
}

/** Alternatives for swapping: same pattern first, then anything hitting the same primary muscle. */
export function alternatives(exId: string, pattern: Pattern, equip: Equip[]): Exercise[] {
  const main = EX[exId].muscles[0];
  const seen = new Set<string>([exId]);
  const out: Exercise[] = [];
  for (const e of [...candidatesFor(pattern, equip), ...EXERCISES.filter((e) => e.muscles[0] === main && available(e, equip))]) {
    if (!seen.has(e.id)) { seen.add(e.id); out.push(e); }
  }
  return out;
}

function baseSets(ex: Exercise, exp: Profile['experience']) {
  if (exp === 'beginner') return ex.kind === 'compound' ? 3 : 2;
  if (exp === 'advanced') return ex.kind === 'compound' ? 4 : 3;
  return 3;
}

export function makeSlot(ex: Exercise, pattern: Pattern, exp: Profile['experience']): Slot {
  return { exId: ex.id, pattern, sets: baseSets(ex, exp), reps: ex.reps, rest: ex.rest };
}

export function generatePlan(profile: Profile): Plan {
  const split = SPLITS[profile.days] ?? SPLITS[3];
  const max = MAX_EXERCISES[profile.minutes] ?? 6;
  const days: DayPlan[] = split.map(([key, offset]) => {
    const used = new Set<string>();
    const slots: Slot[] = [];
    for (const [pattern, variant] of DAYS[key]) {
      if (slots.length >= max) break;
      const options = candidatesFor(pattern, profile.equipment).filter((e) => !used.has(e.id));
      if (!options.length) continue;
      const ex = options[(variant + offset) % options.length];
      used.add(ex.id);
      slots.push(makeSlot(ex, pattern, profile.experience));
    }
    return { key, slots };
  });
  return { id: uid(), createdAt: Date.now(), weeks: 5, days };
}

/** Week-by-week periodisation: volume ramps up, RIR goes down, the last week is a deload. */
export function weekInfo(plan: Plan, week: number) {
  const deload = week >= plan.weeks;
  const rir = deload ? 4 : [3, 2, 2, 1][Math.min(week - 1, 3)];
  const extraSets = deload ? 0 : week >= 3 ? 1 : 0;
  return { deload, rir, extraSets };
}

export function setsFor(slot: Slot, plan: Plan, week: number) {
  const { deload, extraSets } = weekInfo(plan, week);
  const ex = EX[slot.exId];
  if (deload) return Math.max(1, Math.ceil(slot.sets / 2));
  return slot.sets + (ex.kind === 'compound' || slot.sets < 3 ? extraSets : 0);
}

export function increment(ex: Exercise) {
  if (ex.load === 'bodyweight') return 0;
  if (ex.load === 'dumbbell') return 2;
  return 2.5;
}

export function lastPerformance(history: Session[], exId: string) {
  for (let i = history.length - 1; i >= 0; i--) {
    const e = history[i].exercises.find((x) => x.exId === exId);
    if (e && e.sets.length) return { sets: e.sets, date: history[i].start };
  }
  return null;
}

export type SuggestionKind = 'up' | 'reps' | 'first' | 'deload';

/** Double progression: hit the top of the rep range on every set → add weight. */
export function suggest(history: Session[], slot: { exId: string; reps: [number, number] }, deload: boolean) {
  const ex = EX[slot.exId];
  const last = lastPerformance(history, slot.exId);
  if (!last) return { kind: 'first' as SuggestionKind, w: 0, r: slot.reps[0] };
  const topWeight = Math.max(...last.sets.map((s) => s.w));
  const working = last.sets.filter((s) => s.w === topWeight);
  const best = Math.max(...working.map((s) => s.r));
  if (deload) return { kind: 'deload' as SuggestionKind, w: topWeight, r: slot.reps[0] };
  const allTop = working.every((s) => s.r >= slot.reps[1]);
  if (allTop && increment(ex) > 0) return { kind: 'up' as SuggestionKind, w: topWeight + increment(ex), r: slot.reps[0] };
  return { kind: 'reps' as SuggestionKind, w: topWeight, r: Math.min(slot.reps[1], best + 1) };
}

/** Epley estimated one-rep max. */
export const e1rm = (w: number, r: number) => (r <= 1 ? w : w * (1 + r / 30));

export function weeklySetsPerMuscle(days: { exId: string; sets: number }[]) {
  const out: Partial<Record<Muscle, number>> = {};
  for (const d of days) {
    const ex = EX[d.exId];
    for (const m of ex.muscles) out[m] = (out[m] ?? 0) + d.sets;
    for (const m of ex.secondary) out[m] = (out[m] ?? 0) + d.sets * 0.5;
  }
  return out;
}
