import type { Anim, Frame, Vec } from './types';

export const L = { torso: 52, neck: 16, head: 10, ua: 32, fa: 30, th: 43, sh: 41, foot: 13, hipW: 9, shW: 18 };

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const dir = (a: number, len: number): Vec => [Math.cos(rad(a)) * len, Math.sin(rad(a)) * len];
const add = (p: Vec, q: Vec): Vec => [p[0] + q[0], p[1] + q[1]];
const sub = (p: Vec, q: Vec): Vec => [p[0] - q[0], p[1] - q[1]];

/** Two-bone inverse kinematics. Returns [middle joint, end]. */
function ik(start: Vec, target: Vec, l1: number, l2: number, bend: number): [Vec, Vec] {
  const d0 = Math.hypot(target[0] - start[0], target[1] - start[1]);
  const d = Math.min(Math.max(d0, Math.abs(l1 - l2) + 0.5), l1 + l2 - 0.01);
  const base = deg(Math.atan2(target[1] - start[1], target[0] - start[0]));
  const cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const alpha = deg(Math.acos(Math.min(1, Math.max(-1, cos))));
  const mid = add(start, dir(base + bend * alpha, l1));
  const end = d0 > l1 + l2 ? add(start, dir(base, l1 + l2)) : target;
  return [mid, end];
}

export interface Limb { root: Vec; mid: Vec; end: Vec; tip?: Vec }
export interface Pose {
  hip: Vec; shoulder: Vec; head: Vec;
  arm: Limb; arm2: Limb; leg: Limb; leg2: Limb;
  hipR?: Vec; hipL?: Vec; shR?: Vec; shL?: Vec;
}

export function lerpFrame(a: Frame, b: Frame, k: number): Frame {
  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const va = (a as Record<string, unknown>)[key];
    const vb = (b as Record<string, unknown>)[key] ?? va;
    const v0 = va ?? vb;
    if (Array.isArray(v0)) {
      const p = v0 as number[], q = vb as number[];
      out[key] = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
    } else {
      out[key] = (v0 as number) + ((vb as number) - (v0 as number)) * k;
    }
  }
  return out as Frame;
}

type ArmSpec = { a?: Vec; aw?: Vec; ah?: Vec };
type LegSpec = { l?: Vec; lf?: Vec };

function solveArm(sh: Vec, torso: number, spec: ArmSpec, bend: number, mirrorX?: number): Limb {
  if (spec.ah) {
    let target = spec.ah;
    if (mirrorX !== undefined) target = [2 * mirrorX - target[0], target[1]];
    const [mid, end] = ik(sh, target, L.ua, L.fa, mirrorX !== undefined ? -bend : bend);
    return { root: sh, mid, end };
  }
  let [ua, fa] = spec.aw ?? spec.a ?? [90, 90];
  if (!spec.aw) { ua += torso + 90; fa += torso + 90; }
  if (mirrorX !== undefined) { ua = 180 - ua; fa = 180 - fa; }
  const mid = add(sh, dir(ua, L.ua));
  return { root: sh, mid, end: add(mid, dir(fa, L.fa)) };
}

function solveLeg(hip: Vec, spec: LegSpec, bend: number, foot: number, mirrorX?: number, front = false): Limb {
  let mid: Vec, end: Vec;
  if (spec.lf) {
    let target = spec.lf;
    if (mirrorX !== undefined) target = [2 * mirrorX - target[0], target[1]];
    [mid, end] = ik(hip, target, L.th, L.sh, mirrorX !== undefined ? -bend : bend);
  } else {
    let [th, sh] = spec.l ?? [90, 90];
    if (mirrorX !== undefined) { th = 180 - th; sh = 180 - sh; }
    mid = add(hip, dir(th, L.th));
    end = add(mid, dir(sh, L.sh));
  }
  const tip: Vec = front ? add(end, [mirrorX !== undefined ? -6 : 6, 2]) : add(end, dir(foot, L.foot));
  return { root: hip, mid, end, tip };
}

export function solve(anim: Anim, f: Frame): Pose {
  const front = anim.view === 'front';
  const torso = f.t ?? -90;
  const armBend = anim.armBend ?? 1;
  const legBend = anim.legBend ?? -1;
  let hip: Vec = f.hip ?? [110, 123];

  // Translate so the anchor joint is fixed.
  if (anim.anchor) {
    const probe = solveRaw([0, 0]);
    const joint = anim.anchor.joint === 'ankle' ? probe.leg.end : probe.arm.end;
    hip = sub(anim.anchor.at, joint);
  }
  return solveRaw(hip);

  function solveRaw(h: Vec): Pose {
    const shoulder = add(h, dir(torso, L.torso));
    const head = add(shoulder, dir(torso + (f.h ?? 0), L.neck));
    if (front) {
      const cx = h[0];
      const shR = add(shoulder, [L.shW, 0]), shL = add(shoulder, [-L.shW, 0]);
      const hipR: Vec = add(h, [L.hipW, 0]), hipL: Vec = add(h, [-L.hipW, 0]);
      // Right side of the screen; the left side is mirrored around the body centre.
      const arm = solveArm(shR, torso, { a: f.a, aw: f.aw, ah: f.ah }, armBend);
      const arm2 = solveArm(shL, torso, { a: f.a, aw: f.aw, ah: f.ah }, armBend, shoulder[0]);
      const leg = solveLeg(hipR, { l: f.l, lf: f.lf }, legBend, 0, undefined, true);
      const leg2 = solveLeg(hipL, { l: f.l, lf: f.lf }, legBend, 0, cx, true);
      return { hip: h, shoulder, head, arm, arm2, leg, leg2, hipR, hipL, shR, shL };
    }
    const arm = solveArm(shoulder, torso, { a: f.a, aw: f.aw, ah: f.ah }, armBend);
    const arm2 = solveArm(shoulder, torso, {
      a: f.a2 ?? (f.aw2 || f.ah2 ? undefined : f.a),
      aw: f.aw2 ?? (f.a2 || f.ah2 ? undefined : f.aw),
      ah: f.ah2 ?? (f.a2 || f.aw2 ? undefined : f.ah),
    }, armBend);
    const leg = solveLeg(h, { l: f.l, lf: f.lf }, legBend, f.f ?? 0);
    const leg2 = solveLeg(h, {
      l: f.l2 ?? (f.lf2 ? undefined : f.l),
      lf: f.lf2 ?? (f.l2 ? undefined : f.lf),
    }, legBend, f.f2 ?? f.f ?? 0);
    return { hip: h, shoulder, head, arm, arm2, leg, leg2 };
  }
}

export const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

/** Frame at time `time` (seconds) — ping-pongs through the keyframes. */
export function frameAt(anim: Anim, time: number): Frame {
  const fr = anim.frames;
  if (fr.length === 1) return fr[0];
  const [down, holdB, up, holdA] = anim.tempo ?? [1.4, 0.35, 1.0, 0.5];
  const steps = fr.length - 1;
  const cycle = down + holdB + up + holdA;
  let t = time % cycle;
  const seg = (p: number) => {
    const x = p * steps;
    const i = Math.min(Math.floor(x), steps - 1);
    return lerpFrame(fr[i], fr[i + 1], ease(x - i));
  };
  if (t < down) return seg(t / down);
  t -= down;
  if (t < holdB) return fr[steps];
  t -= holdB;
  if (t < up) return seg(1 - t / up);
  return fr[0];
}
