import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Muscle } from '../data/types';
import { createHuman, poseAndPlant, type HumanInstance, type PoseResult } from './human';
import { frameAt, solve } from './skeleton';
import type { Anim, Vec } from './types';

const ANKLE_HEIGHT = 0.82; // decimetres, model foot joint above the sole

function studio(renderer: THREE.WebGLRenderer, scene: THREE.Scene, dark: boolean) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dark ? 1.0 : 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.HemisphereLight(0xffffff, dark ? 0x1c1c22 : 0xbfc0c8, dark ? 1.2 : 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-14, 28, 22);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 26, bottom: -6, near: 1, far: 90 });
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7);
  fill.position.set(20, 10, 10);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(dark ? 0xaab8ff : 0xffffff, dark ? 1.6 : 0.9);
  rim.position.set(6, 18, -26);
  scene.add(rim);
}

/** Equipment in real-world sizes (decimetres); returns a per-frame updater. */
function buildProps(scene: THREE.Object3D, anim: Anim, h: HumanInstance, pos: (p: Vec) => THREE.Vector3, barLift: number) {
  const g = new THREE.Group();
  scene.add(g);
  const metal = new THREE.MeshStandardMaterial({ color: 0xc7cad1, metalness: 0.85, roughness: 0.3 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2b2b30, metalness: 0.35, roughness: 0.5 });
  const pad = new THREE.MeshStandardMaterial({ color: 0x3a3a41, roughness: 0.75 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x8c8f97, metalness: 0.6, roughness: 0.4 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D = g) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const alongX = (geo: THREE.BufferGeometry) => geo.rotateZ(Math.PI / 2);
  const up: ((r: PoseResult) => void)[] = [];
  const front = anim.view === 'front';

  for (const p of anim.props ?? []) {
    switch (p.k) {
      case 'bb': {
        const bar = new THREE.Group();
        g.add(bar);
        add(alongX(new THREE.CylinderGeometry(0.14, 0.14, 20, 14)), metal, bar);
        for (const s of [-1, 1]) {
          add(alongX(new THREE.CylinderGeometry(0.25, 0.25, 4.2, 14)), metal, bar).position.x = s * 8.4;
          add(alongX(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 18)), metal, bar).position.x = s * 6.4;
          for (const [x, r] of [[6.75, 2.25], [7.15, 2.25], [7.5, 1.6]] as const) {
            add(alongX(new THREE.CylinderGeometry(r, r, 0.36, 40)), iron, bar).position.x = s * x;
          }
        }
        up.push((r) => {
          if (p.at === 'hands') {
            bar.position.copy(r.hands.L).add(r.hands.R).multiplyScalar(0.5);
          } else {
            bar.position.copy(r.chestTop).addScaledVector(r.forward, -0.75).addScaledVector(r.torso, -0.25);
          }
        });
        break;
      }
      case 'db':
        for (const side of ['L', 'R'] as const) {
          const d = new THREE.Group();
          g.add(d);
          add(alongX(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 10)), metal, d);
          for (const s of [-1, 1]) add(alongX(new THREE.CylinderGeometry(0.58, 0.58, 0.6, 6)), iron, d).position.x = s * 0.85;
          up.push((r) => {
            const hand = h.bones[`hand.${side}`];
            d.position.copy(r.hands[side]).add(new THREE.Vector3(0, -0.45, 0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())));
            if (front) d.rotation.z = Math.PI / 2;
          });
        }
        break;
      case 'bench': {
        if (front) break;
        const a = pos(p.from), b = pos(p.to);
        const len = a.distanceTo(b);
        const top = add(new THREE.BoxGeometry(3, 0.9, len + 0.6), pad);
        top.position.copy(a).lerp(b, 0.5).add(new THREE.Vector3(0, -0.45, 0));
        top.rotation.x = -Math.atan2(b.y - a.y, b.z - a.z);
        if (p.legs !== false) {
          for (const end of [a, b]) {
            const hgt = end.y - 0.9;
            if (hgt <= 0.2) continue;
            add(new THREE.BoxGeometry(2.4, hgt, 0.5), frame).position.set(0, hgt / 2, end.z + Math.sign(b.z - a.z) * (end === a ? 0.8 : -0.8));
          }
        }
        break;
      }
      case 'bar': {
        const at = pos(p.at);
        at.y += barLift;
        add(alongX(new THREE.CylinderGeometry(0.16, 0.16, 13, 14)), metal).position.set(0, at.y, front ? 0 : at.z);
        for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.6, at.y + 0.6, 0.6), frame).position.set(s * 6.5, (at.y + 0.6) / 2, front ? 0 : at.z);
        break;
      }
      case 'cable': {
        const from = pos(p.from);
        const pulleys = front ? { L: from, R: from.clone().setX(-from.x) } : { L: from, R: from };
        const lines = { L: add(new THREE.CylinderGeometry(0.04, 0.04, 1, 6), metal), R: add(new THREE.CylinderGeometry(0.04, 0.04, 1, 6), metal) };
        for (const q of new Set(Object.values(pulleys))) add(new THREE.SphereGeometry(0.35, 16, 12), iron).position.copy(q);
        // A single pulley above or in front pulls a straight handle held in both hands
        const handle = front ? null : add(alongX(new THREE.CylinderGeometry(0.13, 0.13, 7, 12)), metal);
        up.push((r) => {
          if (handle) handle.position.copy(r.hands.L).add(r.hands.R).multiplyScalar(0.5);
          for (const s of ['L', 'R'] as const) {
            const a = pulleys[s], b = r.hands[s];
            const d = b.clone().sub(a);
            lines[s].position.copy(a).addScaledVector(d, 0.5);
            lines[s].scale.set(1, d.length(), 1);
            lines[s].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
          }
        });
        break;
      }
      case 'pad': {
        const roller = add(alongX(new THREE.CylinderGeometry(0.5, 0.5, 4, 20)), pad);
        up.push((r) => roller.position.copy(r.ankles.L).add(r.ankles.R).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.1, 0.6)));
        break;
      }
      case 'footplate': {
        const plate = add(new THREE.BoxGeometry(5, 4.8, 0.3), iron);
        up.push((r) => {
          plate.position.copy(r.ankles.L).add(r.ankles.R).multiplyScalar(0.5);
          plate.position.z += 0.35;
          plate.rotation.x = ((p.angle - 90) * Math.PI) / 180;
        });
        break;
      }
      case 'step': {
        const a = pos([p.x, p.y]), b = pos([p.x + p.w, 210]);
        add(new THREE.BoxGeometry(5, a.y - b.y, Math.abs(b.z - a.z)), pad).position.set(0, (a.y + b.y) / 2, (a.z + b.z) / 2);
        break;
      }
      default:
        break;
    }
  }
  return (r: PoseResult) => up.forEach((u) => u(r));
}

interface Props { anim: Anim; primary: Muscle[]; secondary: Muscle[]; playing?: boolean; dark?: boolean; still?: number }

export default function HumanFigure({ anim, primary, secondary, playing = true, dark = false, still = 0 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const playRef = useRef(playing);
  playRef.current = playing;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const human = await createHuman(primary, secondary);
      if (disposed) return;
      const el = host.current!;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      studio(renderer, scene, dark);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: dark ? 0.5 : 0.16 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // Lying top-view animations: lay the figure on its back on a flat bench
      const holder = new THREE.Group();
      scene.add(holder);
      holder.add(human.root);
      if (anim.noGround) {
        holder.rotation.x = -Math.PI / 2;
        holder.position.set(0, 5.2, 4);
        const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 4.3, 11), new THREE.MeshStandardMaterial({ color: 0x3a3a41, roughness: 0.75 }));
        bench.position.set(0, 2.15, -8.5);
        bench.castShadow = bench.receiveShadow = true;
        scene.add(bench);
      }
      holder.updateMatrixWorld(true);

      // Hanging exercises: raise the bar until the feet clear the floor in every frame
      const [down] = anim.tempo ?? [1.4];
      let barLift = 0;
      if (anim.props?.some((p) => p.k === 'bar')) {
        for (let i = 0; i <= 8; i++) {
          const r = poseAndPlant(human, anim, solve(anim, frameAt(anim, (i / 8) * down)), ANKLE_HEIGHT);
          barLift = Math.max(barLift, ANKLE_HEIGHT + 2.2 - Math.min(r.ankles.L.y, r.ankles.R.y));
        }
      }
      const first = poseAndPlant(human, anim, solve(anim, frameAt(anim, 0)), ANKLE_HEIGHT, barLift);
      const update = buildProps(scene, anim, human, first.mapped.pos, barLift);

      // Frame the whole motion
      const box = new THREE.Box3();
      for (let i = 0; i <= 8; i++) {
        poseAndPlant(human, anim, solve(anim, frameAt(anim, (i / 8) * down)), ANKLE_HEIGHT, barLift);
        for (const b of Object.values(human.bones)) box.expandByPoint(b.getWorldPosition(new THREE.Vector3()));
      }
      box.expandByScalar(1.4);
      box.min.y = Math.min(box.min.y, 0);
      box.max.y += 0.8; // top of the head
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 500);
      const az = ((anim.view === 'front' ? -28 : -58) * Math.PI) / 180;
      const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
      const aspect = el.clientWidth / Math.max(1, el.clientHeight) || 0.85;
      const dist = Math.max(size.y / 2 / tanHalf, Math.max(size.x, size.z) / 2 / (tanHalf * aspect)) * 1.12;
      camera.position.set(center.x + Math.sin(az) * dist, center.y + dist * 0.16, center.z + Math.cos(az) * dist);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(center);
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.enableDamping = true;
      controls.minPolarAngle = Math.PI * 0.2;
      controls.maxPolarAngle = Math.PI * 0.52;
      controls.update();

      const resize = () => {
        const w = el.clientWidth, hgt = el.clientHeight;
        renderer.setSize(w, hgt, false);
        camera.aspect = w / hgt;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();
      setReady(true);

      let raf = 0, t = still * down, last = performance.now();
      const tick = (now: number) => {
        if (playRef.current) t += (now - last) / 1000;
        last = now;
        const r = poseAndPlant(human, anim, solve(anim, frameAt(anim, t)), ANKLE_HEIGHT, barLift);
        update(r);
        controls.update();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        controls.dispose();
        scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch((e) => console.error(e));
    return () => { disposed = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, dark]);

  return <div ref={host} className={`figure3d ${ready ? 'ready' : ''}`} />;
}

/** Front and back views of the model at rest with this exercise's muscles coloured in. */
export function MuscleMap({ primary, secondary, dark = false }: { primary: Muscle[]; secondary: Muscle[]; dark?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cleanup = () => {};
    let disposed = false;
    (async () => {
      const human = await createHuman(primary, secondary);
      if (disposed) return;
      const el = host.current!;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      studio(renderer, scene, dark);
      renderer.shadowMap.enabled = false;
      const lights: THREE.DirectionalLight[] = [];
      scene.traverse((o) => { if (o instanceof THREE.DirectionalLight) lights.push(o); });
      scene.add(human.root);
      // Relax the arms a little away from the body so the sides of the torso show
      for (const s of ['L', 'R'] as const) {
        human.bones[`upperarm.${s}`].rotation.z = s === 'L' ? -0.42 : 0.42;
      }
      human.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(human.mesh, true);
      const c = box.getCenter(new THREE.Vector3());
      const hh = (box.max.y - box.min.y) / 2 + 0.4;
      const cams = [1, -1].map((dir) => {
        const cam = new THREE.OrthographicCamera(-hh * 0.62, hh * 0.62, hh, -hh, 0.1, 200);
        cam.position.set(c.x, c.y, c.z + dir * 40);
        cam.lookAt(c);
        return cam;
      });
      const render = () => {
        const w = el.clientWidth, hgt = el.clientHeight;
        renderer.setSize(w, hgt, false);
        renderer.setScissorTest(true);
        cams.forEach((cam, i) => {
          const half = w / 2;
          const aspect = half / hgt;
          cam.left = -hh * aspect; cam.right = hh * aspect;
          cam.updateProjectionMatrix();
          // keep the key light in front of whichever side we look at
          lights.forEach((l) => { l.position.z = Math.abs(l.position.z) * (i === 0 ? 1 : -1); });
          renderer.setViewport(i * half, 0, half, hgt);
          renderer.setScissor(i * half, 0, half, hgt);
          renderer.render(scene, cam);
        });
      };
      const ro = new ResizeObserver(render);
      ro.observe(el);
      render();
      cleanup = () => {
        ro.disconnect();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch((e) => console.error(e));
    return () => { disposed = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary.join(), secondary.join(), dark]);
  return <div ref={host} className="muscle-map" />;
}
