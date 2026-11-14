import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Muscle } from '../data/types';
import { solve, type Pose } from './skeleton';
import type { Anim } from './types';

/*
 * Realistic human (MakeHuman CC0 base mesh, see tools/build_human.py) driven by the 2D pose solver.
 * Model space: +Y up, +Z forward, +X = the model's left. Units are decimetres.
 */

let cache: Promise<GLTF> | null = null;
export function loadHuman() {
  cache ??= new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/human.glb`);
  return cache;
}

const REGIONS = ['none', 'chest', 'back', 'shoulders', 'rearDelts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes',
  'calves', 'abs', 'forearms', 'traps', 'obliques', 'shorts'];

/** App muscle → model regions it lights up. */
const MUSCLE_REGIONS: Record<Muscle, string[]> = {
  chest: ['chest'], back: ['back', 'traps'], shoulders: ['shoulders'], rearDelts: ['rearDelts'],
  biceps: ['biceps'], triceps: ['triceps'], quads: ['quads'], hamstrings: ['hamstrings'], glutes: ['glutes'],
  calves: ['calves'], abs: ['abs'],
};

const SKIN = new THREE.Color('#d9d9dc');
const PRIMARY = new THREE.Color('#d8452e');
const SECONDARY = new THREE.Color('#4a72d6');
const SHORTS = new THREE.Color('#2a2a30');

/** Average a per-vertex scalar with its mesh neighbours. */
function smoothScalar(values: Float32Array, index: THREE.BufferAttribute, passes: number) {
  const n = values.length;
  const sum = new Float32Array(n), cnt = new Uint16Array(n);
  const idx = index.array;
  for (let p = 0; p < passes; p++) {
    sum.set(values);
    cnt.fill(1);
    for (let t = 0; t < idx.length; t += 3) {
      for (let k = 0; k < 3; k++) {
        const a = idx[t + k], b = idx[t + ((k + 1) % 3)];
        sum[a] += values[b]; sum[b] += values[a];
        cnt[a]++; cnt[b]++;
      }
    }
    for (let i = 0; i < n; i++) values[i] = sum[i] / cnt[i];
  }
}

export interface HumanInstance {
  root: THREE.Object3D;
  mesh: THREE.SkinnedMesh;
  bones: Record<string, THREE.Bone>;
  rest: Record<string, { head: THREE.Vector3; axis: THREE.Vector3; hinge: THREE.Vector3 }>;
  scale: number;
}

export async function createHuman(primary: Muscle[], secondary: Muscle[]): Promise<HumanInstance> {
  const gltf = await loadHuman();
  const root = cloneSkinned(gltf.scene);
  let mesh: THREE.SkinnedMesh | undefined;
  const bones: Record<string, THREE.Bone> = {};
  root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh;
    if ((o as THREE.Bone).isBone) bones[(o.userData.bone as string) ?? o.name] = o as THREE.Bone;
  });
  if (!mesh) throw new Error('human model has no skinned mesh');
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;

  // Colour the muscle regions for this exercise
  const geo = mesh.geometry.clone();
  mesh.geometry = geo;
  const shade = geo.getAttribute('color');
  const region = geo.getAttribute('_muscle');
  const p = new Set(primary.flatMap((m) => MUSCLE_REGIONS[m]));
  const s = new Set(secondary.flatMap((m) => MUSCLE_REGIONS[m]));
  const n = region.count;
  const maskP = new Float32Array(n), maskS = new Float32Array(n), maskK = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const name = REGIONS[Math.round(region.getX(i))];
    maskP[i] = p.has(name) ? 1 : 0;
    maskS[i] = !p.has(name) && s.has(name) ? 1 : 0;
    maskK[i] = name === 'shorts' || name === 'glutes' ? 1 : 0;
  }
  const index = geo.getIndex()!;
  for (const m of [maskP, maskS, maskK]) smoothScalar(m, index, 2);
  const edge = (x: number) => { const t = Math.min(1, Math.max(0, (x - 0.3) / 0.4)); return t * t * (3 - 2 * t); };
  const colors = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    c.copy(SKIN).lerp(SHORTS, edge(maskK[i]));
    c.lerp(SECONDARY, edge(maskS[i]) * 0.92);
    c.lerp(PRIMARY, edge(maskP[i]) * 0.95);
    const k = shade.getX(i);
    colors.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0 });

  const rest: HumanInstance['rest'] = {};
  const X = new THREE.Vector3(1, 0, 0);
  for (const [name, b] of Object.entries(bones)) {
    const head = new THREE.Vector3(...(b.userData.head as [number, number, number]));
    const tail = new THREE.Vector3(...(b.userData.tail as [number, number, number]));
    const axis = tail.clone().sub(head).normalize();
    const hinge = X.clone().addScaledVector(axis, -axis.dot(X)).normalize();
    rest[name] = { head, axis, hinge };
  }
  const leg = rest['thigh.L'].head.distanceTo(rest['shin.L'].head) + rest['shin.L'].head.distanceTo(rest['foot.L'].head);
  return { root, mesh, bones, rest, scale: leg / 84 };
}

// ───────────── retargeting ─────────────
const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tmpM = new THREE.Matrix4();
const tmpM2 = new THREE.Matrix4();

/** World rotation that sends the bone's rest axis to `dir` with its rest hinge on `hinge` (or the minimal swing). */
function aim(rest: HumanInstance['rest'][string], dir: THREE.Vector3, hinge?: THREE.Vector3) {
  const d = dir.clone().normalize();
  const swing = new THREE.Quaternion().setFromUnitVectors(rest.axis, d);
  const hs = rest.hinge.clone().applyQuaternion(swing);
  let h = hs;
  if (hinge && hinge.lengthSq() > 0.04) {
    h = hinge.clone().normalize();
    if (h.dot(hs) < 0) h.negate();
  }
  h.addScaledVector(d, -h.dot(d));
  if (h.lengthSq() < 1e-4) return swing;
  h.normalize();
  const md = tmpM.makeBasis(d, h, v().crossVectors(d, h));
  const mr = tmpM2.makeBasis(rest.axis, rest.hinge, v().crossVectors(rest.axis, rest.hinge)).transpose();
  return new THREE.Quaternion().setFromRotationMatrix(md.multiply(mr));
}

export interface Joints3D { [k: string]: THREE.Vector3 }

/** Map a 2D pose to model-space directions/positions. Side view: x→Z, y→-Y. Front view: x→X. */
export function mapPose(anim: Anim, pose: Pose, s: number) {
  const front = anim.view === 'front';
  const cx = pose.shoulder[0];
  const pos = (p: [number, number]) => (front ? v((p[0] - cx) * s, (210 - p[1]) * s, 0) : v(0, (210 - p[1]) * s, (p[0] - 110) * s));
  const dir = (a: [number, number], b: [number, number]) => (front ? v(b[0] - a[0], a[1] - b[1], 0) : v(0, a[1] - b[1], b[0] - a[0])).normalize();
  const arm = (l: Pose['arm']) => {
    let up = dir(l.root, l.mid), fore = dir(l.mid, l.end);
    if (front && anim.reach3d) {
      // 2D shows only the projection — push the hand forward so the arm keeps its length
      const dx = l.end[0] - l.root[0], dy = l.root[1] - l.end[1];
      const depth = Math.sqrt(Math.max(0, 61 * 61 - dx * dx - dy * dy));
      const hand = v(dx, dy, depth);
      const elbow = hand.clone().multiplyScalar(0.5).add(v(Math.sign(dx) * 5, -4, -6));
      up = elbow.clone().normalize();
      fore = hand.clone().sub(elbow).normalize();
    }
    return { up, fore, end: pos(l.end) };
  };
  const leg = (l: Pose['leg']) => ({
    up: dir(l.root, l.mid), low: dir(l.mid, l.end),
    foot: front ? v(0, -0.45, 1).normalize() : dir(l.end, l.tip ?? [l.end[0] + 10, l.end[1]]),
    ankle: pos(l.end),
  });
  // In side view the near limbs (arm, leg) are the model's right side, facing the camera
  const [armR, armL] = front ? [pose.arm2, pose.arm] : [pose.arm, pose.arm2];
  const [legR, legL] = front ? [pose.leg2, pose.leg] : [pose.leg, pose.leg2];
  return {
    hip: pos(pose.hip),
    torso: dir(pose.hip, pose.shoulder),
    head: dir(pose.shoulder, pose.head),
    arms: { L: arm(armL), R: arm(armR) },
    legs: { L: leg(legL), R: leg(legR) },
    pos,
  };
}

const ORDER = ['hips', 'spine', 'chest', 'neck', 'head', 'clavicle.L', 'clavicle.R', 'upperarm.L', 'upperarm.R', 'forearm.L',
  'forearm.R', 'hand.L', 'hand.R', 'thigh.L', 'thigh.R', 'shin.L', 'shin.R', 'foot.L', 'foot.R'];

/** Turn world-space bone rotations into local ones, parents first. Undriven bones follow their parent. */
function apply(h: HumanInstance, world: Record<string, THREE.Quaternion>) {
  const resolved: Record<string, THREE.Quaternion> = {};
  for (const name of ORDER) {
    const bone = h.bones[name];
    const pname = bone.parent?.userData.bone as string | undefined;
    const pw = pname && resolved[pname] ? resolved[pname] : new THREE.Quaternion();
    const w = world[name] ?? pw.clone();
    resolved[name] = w;
    bone.quaternion.copy(pw.clone().invert().multiply(w));
  }
}

/** Two-bone IK: elbow position for a hand target, bending toward `pole`. */
function solveElbow(sh: THREE.Vector3, target: THREE.Vector3, l1: number, l2: number, pole: THREE.Vector3) {
  const d = target.clone().sub(sh);
  const dist = Math.min(d.length(), l1 + l2 - 1e-3);
  const dir = d.normalize();
  const cos = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const ang = Math.acos(Math.min(1, Math.max(-1, cos)));
  const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  return sh.clone().addScaledVector(dir, Math.cos(ang) * l1).addScaledVector(perp, Math.sin(ang) * l1);
}

type HandTargets = (frame: { chestTop: THREE.Vector3; torso: THREE.Vector3; forward: THREE.Vector3 }) => { L: THREE.Vector3; R: THREE.Vector3; pole: THREE.Vector3 } | null;

/** Pose the instance for one frame; returns world-space hand/ankle positions for props and snapping. */
export function poseHuman(h: HumanInstance, anim: Anim, pose2d: Pose, handTargets?: HandTargets) {
  const m = mapPose(anim, pose2d, h.scale);
  const world: Record<string, THREE.Quaternion> = {};
  const lateral = v(1, 0, 0);
  world.hips = aim(h.rest.hips, m.torso, lateral);
  world.spine = aim(h.rest.spine, m.torso, lateral);
  world.chest = aim(h.rest.chest, m.torso, lateral);
  const headDir = m.head.clone().lerp(m.torso, 0.25);
  world.neck = aim(h.rest.neck, headDir, lateral);
  world.head = aim(h.rest.head, headDir, lateral);
  for (const side of ['L', 'R'] as const) {
    const l = m.legs[side];
    const nl = v().crossVectors(l.up, l.low);
    const hl = nl.lengthSq() > 0.04 ? nl : lateral;
    world[`thigh.${side}`] = aim(h.rest[`thigh.${side}`], l.up, hl);
    world[`shin.${side}`] = aim(h.rest[`shin.${side}`], l.low, hl);
    world[`foot.${side}`] = aim(h.rest[`foot.${side}`], l.foot, lateral);
  }
  h.bones.hips.position.copy(m.hip);

  // Phase 1: torso and legs, so the shoulders are known for hand IK
  apply(h, world);
  h.root.updateMatrixWorld(true);
  const wp = (n: string) => h.bones[n].getWorldPosition(v());
  const forward = v().crossVectors(lateral, m.torso).normalize();
  const targets = handTargets?.({ chestTop: wp('neck'), torso: m.torso, forward });

  for (const side of ['L', 'R'] as const) {
    let { up, fore } = m.arms[side];
    if (targets) {
      const sh = wp(`upperarm.${side}`);
      const l1 = h.rest[`upperarm.${side}`].head.distanceTo(h.rest[`forearm.${side}`].head);
      const l2 = h.rest[`forearm.${side}`].head.distanceTo(h.rest[`hand.${side}`].head);
      const elbow = solveElbow(sh, targets[side], l1, l2, targets.pole);
      up = elbow.clone().sub(sh).normalize();
      fore = targets[side].clone().sub(elbow).normalize();
    }
    const n = v().crossVectors(up, fore);
    world[`upperarm.${side}`] = aim(h.rest[`upperarm.${side}`], up, n.lengthSq() > 0.04 ? n : undefined);
    const ref = v(1, 0, 0).applyQuaternion(world[`upperarm.${side}`]);
    world[`forearm.${side}`] = aim(h.rest[`forearm.${side}`], fore, n.lengthSq() > 0.04 ? n : ref);
    world[`hand.${side}`] = aim(h.rest[`hand.${side}`], fore, ref);
  }
  apply(h, world);
  h.root.updateMatrixWorld(true);
  return {
    mapped: m,
    hands: { L: wp('hand.L'), R: wp('hand.R') },
    ankles: { L: wp('foot.L'), R: wp('foot.R') },
    chestTop: wp('neck'),
    torso: m.torso,
    forward,
  };
}

export type PoseResult = ReturnType<typeof poseHuman>;

/** Pose + keep the figure planted: on its anchor, on the floor, or hanging from the bar. */
/** Where the hands grip a barbell racked on the upper back. */
const backBar: HandTargets = ({ chestTop, torso, forward }) => {
  const c = chestTop.clone().addScaledVector(forward, -0.75).addScaledVector(torso, -0.25);
  return { L: c.clone().add(v(2.7, 0, 0)), R: c.clone().add(v(-2.7, 0, 0)), pole: v(0, -1, 0).addScaledVector(forward, -0.6) };
};

export function poseAndPlant(h: HumanInstance, anim: Anim, pose2d: Pose, ankleHeight: number, barLift = 0) {
  const onBack = anim.props?.some((p) => p.k === 'bb' && p.at === 'back');
  let r = poseHuman(h, anim, pose2d, onBack ? backBar : undefined);
  const offset = v();
  const bar = anim.props?.find((p) => p.k === 'bar');
  if (bar && bar.k === 'bar') {
    const target = r.mapped.pos(bar.at);
    target.y += barLift;
    const hands = r.hands.L.clone().add(r.hands.R).multiplyScalar(0.5);
    offset.set(0, target.y - 0.35 - hands.y, target.z - hands.z);
    if (anim.view === 'front') offset.z = 0;
  } else if (anim.props?.some((p) => p.k === 'bench')) {
    // On a bench the hips/back stay where the 2D pose put them; only keep the feet out of the floor
    const low = Math.min(r.ankles.L.y, r.ankles.R.y);
    if (low < ankleHeight) offset.set(0, ankleHeight - low, 0);
  } else if (!anim.noGround) {
    const anchorSide = anim.anchor?.joint === 'ankle' ? 'R' : null;
    const candidates = (['R', 'L'] as const)
      .map((s) => ({ s, target: r.mapped.legs[s].ankle, model: r.ankles[s] }))
      .filter((c) => anchorSide ? c.s === anchorSide : c.target.y < 9 * h.scale);
    if (candidates.length) {
      const c = candidates.sort((a, b) => a.model.y - b.model.y)[0];
      offset.set(0, ankleHeight - c.model.y, anchorSide || anim.view !== 'front' ? c.target.z - c.model.z : 0);
      if (!anchorSide) offset.z *= 0.6;
    }
  }
  if (offset.lengthSq() > 0) {
    h.bones.hips.position.add(offset);
    h.root.updateMatrixWorld(true);
    r = { ...r, hands: { L: r.hands.L.add(offset), R: r.hands.R.add(offset) }, ankles: { L: r.ankles.L.add(offset), R: r.ankles.R.add(offset) }, chestTop: r.chestTop.add(offset) };
  }
  return r;
}

export { solve };
