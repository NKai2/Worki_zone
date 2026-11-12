import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { frameAt, solve, type Pose } from './skeleton';
import type { Anim, Seg, Vec } from './types';

/*
 * A sculpted mannequin rendered with three.js and driven by the same 2D pose solver as the
 * SVG figure. Side-view poses live in the sagittal (XY) plane with left/right limbs offset on Z;
 * front-view poses map their horizontal axis onto Z. The figure faces +X.
 */

const GROUND = 210;
const ARM_Z = 19;
const LEG_Z = 9.5;
const Y = new THREE.Vector3(0, 1, 0);

type Profile = [number, number][]; // [t along the bone 0..1, radius]

const PROFILES: Record<'ua' | 'fa' | 'th' | 'sh', Profile> = {
  ua: [[0, 6.6], [0.15, 7.3], [0.45, 7.9], [0.66, 6.8], [0.86, 5.2], [1, 4.7]],
  fa: [[0, 5.3], [0.2, 6.1], [0.42, 5.3], [0.75, 3.8], [1, 3.3]],
  th: [[0, 10.2], [0.2, 10.6], [0.48, 9.4], [0.76, 7.3], [0.92, 6.1], [1, 5.8]],
  sh: [[0, 5.9], [0.14, 6.9], [0.32, 7.2], [0.56, 5.5], [0.85, 3.8], [1, 3.5]],
};
// Torso profile along hip → shoulder (unit length, radius = half-width; depth is scaled down)
const TORSO: Profile = [[-0.13, 7.5], [-0.06, 11.4], [0.05, 12.2], [0.25, 11.2], [0.45, 12.6], [0.68, 15.6], [0.86, 16.8], [1.0, 14.6], [1.1, 8.5]];

function lathe(profile: Profile, scaleR = 1, from = -Infinity, to = Infinity) {
  const pts = profile.filter(([t]) => t >= from && t <= to);
  const curve = new THREE.SplineCurve(pts.map(([t, r]) => new THREE.Vector2(r * scaleR, t)));
  const sampled = curve.getPoints(28);
  const first = sampled[0], last = sampled[sampled.length - 1];
  // Round caps so segments blend into the joints
  const cap = (p: THREE.Vector2, dir: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = ((i + 1) / 6) * (Math.PI / 2);
      return new THREE.Vector2(p.x * Math.cos(a), p.y + dir * p.x * Math.sin(a) * 0.012);
    });
  const points = [...cap(first, -1).reverse(), ...sampled, ...cap(last, 1)];
  return new THREE.LatheGeometry(points, 28);
}

const ellipsoid = (rx: number, ry: number, rz: number) => {
  const g = new THREE.SphereGeometry(1, 28, 20);
  g.scale(rx, ry, rz);
  return g;
};

interface Rig {
  root: THREE.Group;
  limbs: Record<'ua' | 'fa' | 'th' | 'sh' | 'ua2' | 'fa2' | 'th2' | 'sh2', THREE.Mesh>;
  sleeves: THREE.Mesh[];
  torso: THREE.Group;
  head: THREE.Mesh;
  neck: THREE.Mesh;
  hands: THREE.Mesh[];
  feet: THREE.Mesh[];
  delts: THREE.Mesh[];
  elbows: THREE.Mesh[];
  knees: THREE.Mesh[];
  props: THREE.Group;
}

function materials() {
  const skin = new THREE.MeshStandardMaterial({ color: 0xdcdee6, roughness: 0.46, metalness: 0 });
  const hl = new THREE.MeshStandardMaterial({ color: 0xf2cbb4, emissive: 0xff6a2a, emissiveIntensity: 0.22, roughness: 0.42 });
  const shorts = new THREE.MeshStandardMaterial({ color: 0x17171c, roughness: 0.82 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8bcc6, metalness: 0.9, roughness: 0.28 });
  const plate = new THREE.MeshStandardMaterial({ color: 0x24242b, roughness: 0.55, metalness: 0.2 });
  const dumbbell = new THREE.MeshStandardMaterial({ color: 0x34343e, roughness: 0.4, metalness: 0.5 });
  const pad = new THREE.MeshStandardMaterial({ color: 0x2c2c33, roughness: 0.7 });
  const mat = new THREE.MeshStandardMaterial({ color: 0x1f1f25, roughness: 0.95 });
  return { skin, hl, shorts, metal, plate, dumbbell, pad, mat };
}
type Mats = ReturnType<typeof materials>;

function buildRig(m: Mats, hl: Set<Seg>): Rig {
  const root = new THREE.Group();
  const mk = (g: THREE.BufferGeometry, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const limbMat = (s: Seg) => (hl.has(s) ? m.hl : m.skin);
  const geo = {
    ua: lathe(PROFILES.ua), fa: lathe(PROFILES.fa), th: lathe(PROFILES.th), sh: lathe(PROFILES.sh),
    sleeve: lathe(PROFILES.th, 1.09, 0, 0.45),
  };
  const limbs = {
    ua: mk(geo.ua, limbMat('ua')), fa: mk(geo.fa, limbMat('fa')), th: mk(geo.th, limbMat('th')), sh: mk(geo.sh, limbMat('sh')),
    ua2: mk(geo.ua, limbMat('ua')), fa2: mk(geo.fa, limbMat('fa')), th2: mk(geo.th, limbMat('th')), sh2: mk(geo.sh, limbMat('sh')),
  };
  const shortsMat = m.shorts;
  const sleeves = [mk(geo.sleeve, shortsMat), mk(geo.sleeve, shortsMat)];

  // Torso: everything in a local frame (x forward, y up the spine, z lateral)
  const torso = new THREE.Group();
  root.add(torso);
  const tmat = hl.has('torso') ? m.hl : m.skin;
  const add = (g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    torso.add(mesh);
    return mesh;
  };
  const body = add(lathe(TORSO), tmat, 0, 0, 0);
  body.scale.set(0.68, 52, 1);
  for (const z of [-6.2, 6.2]) {
    add(ellipsoid(5.6, 6.4, 7.6), tmat, 7.6, 41, z).rotation.z = -0.18; // pecs
    add(ellipsoid(5, 7.5, 7.2), shortsMat, -5.2, 2.5, z * 0.95); // glutes (under the shorts)
    add(ellipsoid(4.2, 11, 4.4), tmat, -4.2, 33, z * 1.85); // lats
  }
  add(ellipsoid(7.4, 6, 11.5), tmat, -3, 51, 0); // traps
  for (let i = 0; i < 3; i++) for (const z of [-2.9, 2.9]) add(ellipsoid(1.6, 3, 2.6), tmat, 7.4 - i * 0.2, 13 + i * 7, z); // abs
  const shortsBody = add(lathe(TORSO, 1.07, -0.13, 0.24), shortsMat, 0, 0, 0);
  shortsBody.scale.set(0.76, 52, 1);

  const deltMat = hl.has('shoulder') ? m.hl : m.skin;
  const delts = [mk(ellipsoid(8, 8.6, 7.6), deltMat), mk(ellipsoid(8, 8.6, 7.6), deltMat)];
  const neck = mk(new THREE.CylinderGeometry(5.6, 7, 1, 20), m.skin);
  const head = mk(ellipsoid(8.4, 10.2, 7.8), m.skin);
  const hands = [mk(ellipsoid(3.6, 5.6, 2.8), m.skin), mk(ellipsoid(3.6, 5.6, 2.8), m.skin)];
  const feet = [mk(ellipsoid(4.6, 8.6, 3.8), m.skin), mk(ellipsoid(4.6, 8.6, 3.8), m.skin)];
  const elbows = [mk(new THREE.SphereGeometry(5, 20, 14), limbMat('ua')), mk(new THREE.SphereGeometry(5, 20, 14), limbMat('ua'))];
  const knees = [mk(new THREE.SphereGeometry(6.1, 20, 14), limbMat('th')), mk(new THREE.SphereGeometry(6.1, 20, 14), limbMat('th'))];
  const props = new THREE.Group();
  root.add(props);
  return { root, limbs, sleeves, torso, head, neck, hands, feet, delts, elbows, knees, props };
}

const v = new THREE.Vector3();
function placeSeg(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  v.subVectors(b, a);
  const len = v.length() || 0.001;
  mesh.position.copy(a);
  mesh.quaternion.setFromUnitVectors(Y, v.normalize());
  mesh.scale.set(1, len, 1);
}
function placeAlong(mesh: THREE.Mesh, at: THREE.Vector3, dir: THREE.Vector3, offset: number) {
  const d = dir.clone().normalize();
  mesh.position.copy(at).addScaledVector(d, offset);
  mesh.quaternion.setFromUnitVectors(Y, d);
}

/** Maps a solved 2D pose into 3D joint positions. */
function joints3D(anim: Anim, pose: Pose) {
  const front = anim.view === 'front';
  const cx = pose.shoulder[0];
  const P = (p: Vec, z = 0) => (front ? new THREE.Vector3(0, GROUND - p[1], p[0] - cx) : new THREE.Vector3(p[0] - 110, GROUND - p[1], z));
  const arm = (l: Pose['arm'], z: number) => {
    const s = P(l.root, z), e = P(l.mid, z), h = P(l.end, z);
    if (front && anim.reach3d) {
      // Front-view 2D only shows the projection: push the hand forward so the arm keeps its length
      const reach = 60;
      const planar = Math.hypot(h.y - s.y, h.z - s.z);
      h.x = Math.sqrt(Math.max(0, reach * reach - planar * planar));
      e.copy(s).lerp(h, 0.5);
      e.y -= 4;
      e.z += Math.sign(s.z) * 5;
    }
    return { s, e, h };
  };
  const leg = (l: Pose['leg'], z: number) => ({ hip: P(l.root, z), knee: P(l.mid, z), ankle: P(l.end, z), toe: P(l.tip ?? l.end, z) });
  return {
    hip: P(pose.hip), shoulder: P(pose.shoulder), head: P(pose.head),
    arms: [arm(pose.arm, ARM_Z), arm(pose.arm2, -ARM_Z)],
    legs: [leg(pose.leg, LEG_Z), leg(pose.leg2, -LEG_Z)],
    P,
  };
}

function applyPose(rig: Rig, anim: Anim, pose: Pose) {
  const j = joints3D(anim, pose);
  const up = j.shoulder.clone().sub(j.hip).normalize();
  const lateral = new THREE.Vector3(0, 0, 1);
  const forward = new THREE.Vector3().crossVectors(up, lateral).normalize();
  lateral.crossVectors(forward, up).normalize();
  rig.torso.position.copy(j.hip);
  rig.torso.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(forward, up, lateral));

  const neckBase = j.shoulder.clone().addScaledVector(up, 2);
  const headDir = j.head.clone().sub(j.shoulder).normalize();
  const headC = j.shoulder.clone().addScaledVector(headDir, 17).addScaledVector(forward, 1.5);
  placeSeg(rig.neck, neckBase, j.shoulder.clone().addScaledVector(headDir, 9));
  rig.head.position.copy(headC);
  rig.head.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3().crossVectors(headDir, lateral).normalize(), headDir, lateral));

  j.arms.forEach((a, i) => {
    placeSeg(i ? rig.limbs.ua2 : rig.limbs.ua, a.s, a.e);
    placeSeg(i ? rig.limbs.fa2 : rig.limbs.fa, a.e, a.h);
    rig.elbows[i].position.copy(a.e);
    placeAlong(rig.hands[i], a.h, a.h.clone().sub(a.e), 3.5);
    rig.delts[i].position.copy(a.s).addScaledVector(up, -1.5);
    rig.delts[i].quaternion.copy(rig.torso.quaternion);
  });
  j.legs.forEach((l, i) => {
    placeSeg(i ? rig.limbs.th2 : rig.limbs.th, l.hip, l.knee);
    placeSeg(i ? rig.limbs.sh2 : rig.limbs.sh, l.knee, l.ankle);
    placeSeg(rig.sleeves[i], l.hip, l.knee);
    rig.knees[i].position.copy(l.knee);
    const toeDir = l.toe.clone().sub(l.ankle);
    if (toeDir.lengthSq() < 1) toeDir.copy(forward);
    placeAlong(rig.feet[i], l.ankle, toeDir, 5.5);
  });
  return j;
}

/** Builds 3D props; returns a per-frame updater. */
function buildProps(rig: Rig, m: Mats, anim: Anim) {
  const g = rig.props;
  const updaters: ((j: ReturnType<typeof joints3D>) => void)[] = [];
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const x = new THREE.Mesh(geo, mat);
    x.castShadow = true;
    x.receiveShadow = true;
    g.add(x);
    return x;
  };
  const alongZ = (geo: THREE.BufferGeometry) => geo.rotateX(Math.PI / 2);
  const front = anim.view === 'front';
  const P = (p: Vec) => (front ? new THREE.Vector3(0, GROUND - p[1], p[0] - 110) : new THREE.Vector3(p[0] - 110, GROUND - p[1], 0));

  for (const p of anim.props ?? []) {
    switch (p.k) {
      case 'bb': {
        const bar = new THREE.Group();
        g.add(bar);
        const shaft = new THREE.Mesh(alongZ(new THREE.CylinderGeometry(1.3, 1.3, 150, 12)), m.metal);
        shaft.castShadow = true;
        bar.add(shaft);
        for (const s of [-1, 1]) {
          for (const [off, r] of [[52, 15], [56, 15], [60, 12]] as const) {
            const plate = new THREE.Mesh(alongZ(new THREE.CylinderGeometry(r, r, 3.4, 36)), m.plate);
            plate.position.z = s * off;
            plate.castShadow = true;
            bar.add(plate);
          }
          const collar = new THREE.Mesh(alongZ(new THREE.CylinderGeometry(2.6, 2.6, 3, 16)), m.metal);
          collar.position.z = s * 48;
          bar.add(collar);
        }
        updaters.push((j) => {
          if (p.at === 'hands') {
            bar.position.copy(j.arms[0].h).add(j.arms[1].h).multiplyScalar(0.5);
            bar.position.z = 0;
          } else {
            bar.position.copy(j.shoulder).add(new THREE.Vector3(-3, -2, 0));
          }
        });
        break;
      }
      case 'db': {
        for (let i = 0; i < 2; i++) {
          const d = new THREE.Group();
          g.add(d);
          const handle = new THREE.Mesh(alongZ(new THREE.CylinderGeometry(1.2, 1.2, 14, 10)), m.metal);
          d.add(handle);
          for (const s of [-1, 1]) {
            const head = new THREE.Mesh(alongZ(new THREE.CylinderGeometry(4.8, 4.8, 5, 6)), m.dumbbell);
            head.position.z = s * 8;
            head.castShadow = true;
            d.add(head);
          }
          updaters.push((j) => d.position.copy(j.arms[i].h));
        }
        break;
      }
      case 'bench': {
        if (front) break; // lying top-view exercises get their own bench below
        const a = P(p.from), b = P(p.to);
        const len = a.distanceTo(b);
        const top = mesh(new THREE.BoxGeometry(len, 6, 28), m.pad);
        top.position.copy(a).lerp(b, 0.5);
        top.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
        if (p.legs !== false) {
          for (const end of [a, b]) {
            const h = end.y - 3;
            if (h <= 0) continue;
            const leg = mesh(new THREE.BoxGeometry(4, h, 20), m.metal);
            leg.position.set(end.x + Math.sign(b.x - a.x) * (end === a ? 6 : -6), h / 2, 0);
          }
        }
        break;
      }
      case 'bar': {
        const at = P(p.at);
        const bar = mesh(alongZ(new THREE.CylinderGeometry(1.6, 1.6, 140, 12)), m.metal);
        bar.position.copy(at);
        bar.position.z = 0;
        for (const s of [-1, 1]) {
          const post = mesh(new THREE.BoxGeometry(5, at.y, 5), m.pad);
          post.position.set(at.x, at.y / 2, s * 70);
        }
        break;
      }
      case 'cable': {
        const pulleys = front && !p.handle ? [P(p.from), P([220 - p.from[0], p.from[1]])] : [P(p.from)];
        if (!front) pulleys[0].z = 0;
        const lines = [0, 1].map(() => mesh(new THREE.CylinderGeometry(0.45, 0.45, 1, 6), m.metal));
        pulleys.forEach((q) => mesh(new THREE.SphereGeometry(4, 16, 12), m.plate).position.copy(q));
        updaters.push((j) => {
          j.arms.forEach((a, i) => placeSeg(lines[i], pulleys[Math.min(i, pulleys.length - 1)], a.h));
        });
        break;
      }
      case 'pad': {
        const roller = mesh(alongZ(new THREE.CylinderGeometry(5, 5, 34, 18)), m.pad);
        updaters.push((j) => { roller.position.copy(j.legs[0].ankle); roller.position.z = 0; roller.position.y += 2; });
        break;
      }
      case 'footplate': {
        const plate = mesh(new THREE.BoxGeometry(3, 40, 44), m.metal);
        updaters.push((j) => {
          plate.position.copy(j.legs[0].ankle);
          plate.position.z = 0;
          plate.position.x += 4;
          plate.rotation.z = (-(p.angle - 90) * Math.PI) / 180;
        });
        break;
      }
      case 'step': {
        const h = GROUND - p.y;
        const box = mesh(new THREE.BoxGeometry(p.w, h, 46), m.pad);
        box.position.set(p.x + p.w / 2 - 110, h / 2, 0);
        break;
      }
      default:
        break;
    }
  }
  return (j: ReturnType<typeof joints3D>) => updaters.forEach((u) => u(j));
}

interface Props { anim: Anim; highlight?: Seg[]; playing?: boolean; still?: number }

export default function Figure3D({ anim, highlight = [], playing = true, still = 0.5 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const playRef = useRef(playing);
  playRef.current = playing;

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1b1640, 420, 900);
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);

    scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x2a1f5e, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(160, 300, 220);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -200, right: 200, top: 260, bottom: -60, near: 50, far: 900 });
    key.shadow.radius = 6;
    key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9b7bff, 3.2);
    rim.position.set(-220, 160, -260);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(260, 80, -60);
    scene.add(fill);

    const m = materials();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.45 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const mat = new THREE.Mesh(new THREE.BoxGeometry(250, 1.6, 110), m.mat);
    mat.position.y = 0.8;
    mat.receiveShadow = true;
    scene.add(mat);

    const rig = buildRig(m, new Set(highlight));
    scene.add(rig.root);
    const updateProps = buildProps(rig, m, anim);

    // Top-view animations (lying exercises) are rotated so the figure lies on its back on a bench.
    if (anim.noGround) {
      rig.root.rotation.z = Math.PI / 2;
      rig.root.position.set(95, 44, 0);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(130, 36, 30), m.pad);
      bench.position.set(-10, 18, 0);
      bench.castShadow = bench.receiveShadow = true;
      scene.add(bench);
    }

    // Frame the camera on the motion's bounding box (sampled across the cycle)
    const box = new THREE.Box3();
    const [down] = anim.tempo ?? [1.4];
    for (let i = 0; i <= 6; i++) {
      const j = applyPose(rig, anim, solve(anim, frameAt(anim, (i / 6) * down)));
      rig.root.updateMatrixWorld(true);
      for (const p of [j.hip, j.shoulder, j.head, ...j.arms.flatMap((a) => [a.e, a.h]), ...j.legs.flatMap((l) => [l.knee, l.ankle])])
        box.expandByPoint(p.clone().applyMatrix4(rig.root.matrixWorld));
    }
    box.expandByPoint(new THREE.Vector3(box.getCenter(new THREE.Vector3()).x, 0, 0)); // keep the floor in view
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    // Fit both the height and the widest horizontal extent, for the 4:5 stage
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
    const aspect = 0.8;
    const wide = Math.max(size.x, size.z) + 40;
    const dist = Math.max((size.y + 40) / 2 / tanHalf, wide / 2 / (tanHalf * aspect)) * 1.08;
    const az = (38 * Math.PI) / 180;
    camera.position.set(center.x + Math.sin(az) * dist, center.y + dist * 0.28, center.z + Math.cos(az) * dist);
    camera.lookAt(center);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(center);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let raf = 0;
    let t = still * down;
    let last = performance.now();
    const tick = (now: number) => {
      if (playRef.current) t += (now - last) / 1000;
      last = now;
      const j = applyPose(rig, anim, solve(anim, frameAt(anim, t)));
      updateProps(j);
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((x) => x.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Rebuild only when the exercise changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim]);

  return <div ref={host} className="figure3d" />;
}


