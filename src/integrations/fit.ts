import { Encoder, Profile } from '@garmin/fitsdk';
import { EX } from '../data/exercises';
import type { Session } from '../store';

/** Garmin exercise categories so sets show up with proper names in Garmin Connect. */
const CATEGORY: Record<string, string> = {
  squat: 'squat', goblet_squat: 'squat', bw_squat: 'squat', leg_press: 'squat',
  rdl: 'deadlift', db_rdl: 'deadlift', deadlift: 'deadlift',
  hip_thrust: 'hipRaise', glute_bridge: 'hipRaise',
  split_squat: 'lunge', bulgarian: 'lunge',
  leg_curl: 'legCurl', calf_raise: 'calfRaise',
  bench_press: 'benchPress', db_bench: 'benchPress', incline_db_press: 'benchPress', chest_press: 'benchPress',
  push_up: 'pushUp', pike_push_up: 'pushUp', cable_fly: 'flye', db_fly: 'flye',
  lat_pulldown: 'pullUp', pull_up: 'pullUp',
  barbell_row: 'row', inverted_row: 'row', db_row: 'row', cable_row: 'row', face_pull: 'row',
  ohp: 'shoulderPress', db_shoulder_press: 'shoulderPress', lateral_raise: 'lateralRaise',
  db_curl: 'curl', hammer_curl: 'curl', barbell_curl: 'curl', cable_curl: 'curl',
  pushdown: 'tricepsExtension', overhead_ext: 'tricepsExtension', skull_crusher: 'tricepsExtension', bench_dip: 'tricepsExtension',
  hanging_leg_raise: 'legRaise', leg_raise: 'legRaise', crunch: 'crunch', plank: 'plank',
};

/** Builds a FIT strength-training activity. Sets are spread evenly across the session time. */
export function sessionToFit(s: Session): Uint8Array {
  const enc = new Encoder();
  const write = (num: number, mesg: Record<string, unknown>) =>
    (enc as unknown as { onMesg(n: number, m: Record<string, unknown>): void }).onMesg(num, mesg);
  const start = new Date(s.start);
  const end = new Date(Math.max(s.end, s.start + 60_000));
  const elapsed = (end.getTime() - start.getTime()) / 1000;

  write(Profile.MesgNum.FILE_ID, { type: 'activity', manufacturer: 'development', product: 1, timeCreated: start, serialNumber: 1234 });
  write(Profile.MesgNum.EVENT, { timestamp: start, event: 'timer', eventType: 'start' });

  const all = s.exercises.flatMap((e) => e.sets.map((set) => ({ exId: e.exId, ...set })));
  const slice = elapsed / Math.max(1, all.length);
  all.forEach((set, i) => {
    const t0 = new Date(start.getTime() + i * slice * 1000);
    const work = Math.min(45, slice * 0.4);
    const mesg: Record<string, unknown> = {
      timestamp: new Date(t0.getTime() + work * 1000),
      startTime: t0,
      duration: work,
      setType: 'active',
      repetitions: set.r,
      weight: set.w,
      messageIndex: i * 2,
    };
    const cat = CATEGORY[set.exId];
    if (cat) mesg.category = [cat];
    write(Profile.MesgNum.SET, mesg);
    write(Profile.MesgNum.SET, {
      timestamp: new Date(t0.getTime() + slice * 1000),
      startTime: new Date(t0.getTime() + work * 1000),
      duration: slice - work,
      setType: 'rest',
      messageIndex: i * 2 + 1,
    });
  });

  write(Profile.MesgNum.EVENT, { timestamp: end, event: 'timer', eventType: 'stop' });
  const common = { timestamp: end, startTime: start, totalElapsedTime: elapsed, totalTimerTime: elapsed, sport: 'training', subSport: 'strengthTraining' };
  write(Profile.MesgNum.LAP, { ...common, messageIndex: 0, event: 'lap', eventType: 'stop' });
  write(Profile.MesgNum.SESSION, { ...common, messageIndex: 0, firstLapIndex: 0, numLaps: 1, event: 'session', eventType: 'stop' });
  write(Profile.MesgNum.ACTIVITY, { timestamp: end, totalTimerTime: elapsed, numSessions: 1, type: 'manual', event: 'activity', eventType: 'stop', localTimestamp: Math.round(end.getTime() / 1000 - end.getTimezoneOffset() * 60 - 631065600) });
  return enc.close();
}

export function downloadFit(s: Session) {
  const bytes = sessionToFit(s);
  const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `worki-${new Date(s.start).toISOString().slice(0, 10)}.fit`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const exName = (id: string) => EX[id]?.name.en ?? id;
