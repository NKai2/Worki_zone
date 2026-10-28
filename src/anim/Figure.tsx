import { useEffect, useRef, useState } from 'react';
import type { Anim, Prop, Seg, Vec } from './types';
import { frameAt, L, solve, type Limb, type Pose } from './skeleton';

const GROUND = 210;

const line = (p: Vec, q: Vec, cls: string, w?: number) => (
  <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} className={cls} strokeWidth={w} />
);

function limb(l: Limb, cls: string, hl: Set<Seg>, upper: Seg, lower: Seg, w: number) {
  return (
    <g>
      {line(l.root, l.mid, hl.has(upper) ? `${cls} hl` : cls, w)}
      {line(l.mid, l.end, hl.has(lower) ? `${cls} hl` : cls, w)}
      {l.tip && line(l.end, l.tip, cls, w - 2)}
    </g>
  );
}

function Plate({ at, r = 15 }: { at: Vec; r?: number }) {
  return (
    <g>
      <circle cx={at[0]} cy={at[1]} r={r} className="plate" />
      <circle cx={at[0]} cy={at[1]} r={3} className="plate-hub" />
    </g>
  );
}

function Dumbbell({ at, vertical }: { at: Vec; vertical?: boolean }) {
  const [x, y] = at;
  return vertical ? (
    <g className="dumbbell">
      <rect x={x - 4} y={y - 12} width={8} height={6} rx={2} />
      <rect x={x - 4} y={y + 6} width={8} height={6} rx={2} />
      <rect x={x - 1.5} y={y - 7} width={3} height={14} />
    </g>
  ) : (
    <g className="dumbbell">
      <circle cx={x} cy={y} r={7} />
      <circle cx={x} cy={y} r={2.5} className="plate-hub" />
    </g>
  );
}

function backProps(props: Prop[], pose: Pose, front: boolean) {
  return props.map((p, i) => {
    switch (p.k) {
      case 'bench':
        return (
          <g key={i} className="bench">
            {line(p.from, p.to, 'bench-pad', 9)}
            {p.legs !== false && line([p.from[0] + 6, p.from[1] + 4], [p.from[0] + 6, GROUND], 'bench-leg', 4)}
            {p.legs !== false && line([p.to[0] - 6, p.to[1] + 4], [p.to[0] - 6, GROUND], 'bench-leg', 4)}
          </g>
        );
      case 'bar':
        return front ? (
          <g key={i}>
            {line([p.at[0] - 60, p.at[1]], [p.at[0] + 60, p.at[1]], 'rig', 5)}
            {line([p.at[0] - 60, p.at[1]], [p.at[0] - 60, GROUND], 'rig', 4)}
            {line([p.at[0] + 60, p.at[1]], [p.at[0] + 60, GROUND], 'rig', 4)}
          </g>
        ) : (
          <g key={i}>
            {line([p.at[0] + 30 * (p.post ?? -1), p.at[1] - 4], [p.at[0] + 30 * (p.post ?? -1), GROUND], 'rig', 4)}
            {line([p.at[0] + 30 * (p.post ?? -1), p.at[1] - 4], [p.at[0], p.at[1] - 4], 'rig', 4)}
            <circle cx={p.at[0]} cy={p.at[1]} r={4} className="rig-fill" />
          </g>
        );
      case 'cable': {
        const hands: Vec[] = front ? [pose.arm.end, pose.arm2.end] : [pose.arm.end];
        return (
          <g key={i}>
            <circle cx={p.from[0]} cy={p.from[1]} r={5} className="rig-fill" />
            {front && p.handle
              ? line(p.from, [(hands[0][0] + hands[1][0]) / 2, (hands[0][1] + hands[1][1]) / 2], 'cable', 1.5)
              : hands.map((h, j) => {
                  const from: Vec = j === 0 ? p.from : [2 * pose.shoulder[0] - p.from[0], p.from[1]];
                  return (
                    <g key={j}>
                      {j === 1 && <circle cx={from[0]} cy={from[1]} r={5} className="rig-fill" />}
                      {line(from, h, 'cable', 1.5)}
                    </g>
                  );
                })}
          </g>
        );
      }
      case 'step':
        return <rect key={i} x={p.x} y={p.y} width={p.w} height={GROUND - p.y} className="step" rx={2} />;
      case 'mat':
        return <g key={i}>{line([p.x1, GROUND - 2], [p.x2, GROUND - 2], 'mat', 4)}</g>;
      default:
        return null;
    }
  });
}

function frontProps(props: Prop[], pose: Pose, front: boolean) {
  return props.map((p, i) => {
    switch (p.k) {
      case 'bb':
        if (front) {
          const [a, b] = [pose.arm.end, pose.arm2.end];
          const y = (a[1] + b[1]) / 2;
          return (
            <g key={i}>
              {line([pose.shoulder[0] - 62, y], [pose.shoulder[0] + 62, y], 'barbell', 4)}
              <rect x={pose.shoulder[0] + 50} y={y - 15} width={8} height={30} rx={2} className="plate" />
              <rect x={pose.shoulder[0] - 58} y={y - 15} width={8} height={30} rx={2} className="plate" />
            </g>
          );
        }
        return <Plate key={i} at={p.at === 'hands' ? pose.arm.end : [pose.shoulder[0] - 3, pose.shoulder[1] + 2]} />;
      case 'db':
        return front ? (
          <g key={i}><Dumbbell at={pose.arm.end} vertical /><Dumbbell at={pose.arm2.end} vertical /></g>
        ) : (
          <Dumbbell key={i} at={pose.arm.end} />
        );
      case 'pad':
        return <circle key={i} cx={pose.leg.end[0]} cy={pose.leg.end[1] - 2} r={6} className="pad" />;
      case 'footplate': {
        const [x, y] = pose.leg.end;
        const a = (p.angle * Math.PI) / 180;
        const dx = Math.cos(a) * 18, dy = Math.sin(a) * 18;
        return <g key={i}>{line([x - dx + 4, y - dy], [x + dx + 4, y + dy], 'rig', 6)}</g>;
      }
      default:
        return null;
    }
  });
}

interface Props {
  anim: Anim;
  highlight?: Seg[];
  playing?: boolean;
  /** Static snapshot position 0..1 when not playing */
  still?: number;
  className?: string;
}

export default function Figure({ anim, highlight = [], playing = true, still = 0.5, className }: Props) {
  const [time, setTime] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let start: number | undefined;
    const tick = (now: number) => {
      if (start === undefined) start = now - time * 1000;
      setTime((now - start) / 1000);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const [down] = anim.tempo ?? [1.4];
  const t = playing ? time : still * down;
  const frame = frameAt(anim, t);
  const pose = solve(anim, frame);
  const hl = new Set(highlight);
  const front = anim.view === 'front';
  const props = anim.props ?? [];

  return (
    <svg viewBox="0 0 220 220" className={`figure ${className ?? ''}`} role="img" aria-hidden="true">
      {!anim.noGround && <line x1={0} y1={GROUND} x2={220} y2={GROUND} className="ground" />}
      {backProps(props, pose, front)}
      {front ? (
        <g>
          {limb(pose.leg2, 'body', hl, 'th', 'sh', 9)}
          {limb(pose.leg, 'body', hl, 'th', 'sh', 9)}
          <path
            d={`M${pose.shL![0]} ${pose.shL![1]} L${pose.shR![0]} ${pose.shR![1]} L${pose.hipR![0]} ${pose.hipR![1]} L${pose.hipL![0]} ${pose.hipL![1]} Z`}
            className={hl.has('torso') ? 'torso-front hl' : 'torso-front'}
          />
          {hl.has('shoulder') && (
            <g>
              <circle cx={pose.shR![0]} cy={pose.shR![1]} r={6} className="hl-fill" />
              <circle cx={pose.shL![0]} cy={pose.shL![1]} r={6} className="hl-fill" />
            </g>
          )}
          <circle cx={pose.head[0]} cy={pose.head[1]} r={L.head} className="head" />
          {limb(pose.arm2, 'body', hl, 'ua', 'fa', 8)}
          {limb(pose.arm, 'body', hl, 'ua', 'fa', 8)}
        </g>
      ) : (
        <g>
          {limb(pose.arm2, 'body far', hl, 'ua', 'fa', 8)}
          {limb(pose.leg2, 'body far', hl, 'th', 'sh', 9)}
          {line(pose.hip, pose.shoulder, hl.has('torso') ? 'body hl' : 'body', 14)}
          {hl.has('hip') && <circle cx={pose.hip[0]} cy={pose.hip[1]} r={8} className="hl-fill" />}
          {hl.has('shoulder') && <circle cx={pose.shoulder[0]} cy={pose.shoulder[1]} r={7} className="hl-fill" />}
          <circle cx={pose.head[0]} cy={pose.head[1]} r={L.head} className="head" />
          {limb(pose.leg, 'body', hl, 'th', 'sh', 9)}
        </g>
      )}
      {frontProps(props, pose, front)}
      {!front && limb(pose.arm, 'body', hl, 'ua', 'fa', 8)}
    </svg>
  );
}
