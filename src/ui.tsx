import { useEffect, useState, type ReactNode } from 'react';
import Figure from './anim/Figure';
import { EX } from './data/exercises';
import type { Muscle } from './data/types';
import { Icon } from './Icons';
import { MUSCLES, useT } from './i18n';
import { e1rm } from './lib/plan';
import { useStore } from './store';

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3200);
    return () => clearTimeout(id);
  }, [text, onDone]);
  return <div className="toast" role="status">{text}</div>;
}

export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <span />
          <button className="icon-btn" onClick={onClose} aria-label="close"><Icon.close /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MuscleTags({ muscles, accent }: { muscles: Muscle[]; accent?: boolean }) {
  const { tx } = useT();
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {muscles.map((m) => <span key={m} className={`pill ${accent ? 'accent' : ''}`}>{tx(MUSCLES[m])}</span>)}
    </div>
  );
}

export function ExerciseDetail({ exId }: { exId: string }) {
  const { t, tx, lang } = useT();
  const ex = EX[exId];
  const history = useStore((s) => s.history);
  const [playing, setPlaying] = useState(true);
  const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name.en + ' proper form')}`;

  const log = history
    .flatMap((h) => h.exercises.filter((e) => e.exId === exId).map((e) => ({ date: h.start, sets: e.sets })))
    .slice(-5)
    .reverse();
  const best = history.flatMap((h) => h.exercises.filter((e) => e.exId === exId).flatMap((e) => e.sets))
    .reduce((b, s) => Math.max(b, e1rm(s.w, s.r)), 0);

  return (
    <div>
      <div className="stage">
        <Figure anim={ex.anim} highlight={ex.hl} playing={playing} />
        <button className="icon-btn play" onClick={() => setPlaying(!playing)} aria-label={playing ? t('pause') : t('play')}>
          {playing ? <Icon.pause /> : <Icon.play />}
        </button>
      </div>
      <h1 style={{ marginTop: 14 }}>{tx(ex.name)}</h1>
      <div className="muted small">{lang === 'he' ? ex.name.en : ex.name.he}</div>

      <div className="stack" style={{ marginTop: 12 }}>
        <div><div className="muted small">{t('primary')}</div><MuscleTags muscles={ex.muscles} accent /></div>
        {ex.secondary.length > 0 && <div><div className="muted small">{t('secondary')}</div><MuscleTags muscles={ex.secondary} /></div>}
        <div className="muted small">
          {t('equipment')}: {ex.equip.length ? ex.equip.map((e) => t(`eq_${e}`)).join(' · ') : t('noEquipment')}
          {' · '}{ex.reps[0]}-{ex.reps[1]} {ex.id === 'plank' ? t('seconds') : t('reps')}
        </div>
      </div>

      <h2>{t('cues')}</h2>
      <ol className="cues">{ex.cues[lang].map((c) => <li key={c}>{c}</li>)}</ol>
      <h2>{t('mistakes')}</h2>
      <ul className="cues">{ex.mistakes[lang].map((c) => <li key={c}>{c}</li>)}</ul>

      <a className="btn ghost block" style={{ marginTop: 14, textDecoration: 'none' }} href={yt} target="_blank" rel="noreferrer">
        ▶ {t('watchVideo')}
      </a>

      {log.length > 0 && (
        <>
          <h2>{t('history')} {best > 0 && <span className="pill accent">{t('best')} e1RM {best.toFixed(1)}</span>}</h2>
          {log.map((l) => (
            <div key={l.date} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="muted">{new Date(l.date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB')}</span>
              <span>{l.sets.map((s) => (s.w ? `${s.w}×${s.r}` : `${s.r}`)).join('  ')}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function LineChart({ points, unit = '' }: { points: { x: number; y: number }[]; unit?: string }) {
  const { t, lang } = useT();
  if (points.length < 2) return <div className="muted small" style={{ padding: '18px 0' }}>{t('noData')}</div>;
  const W = 320, H = 150, pad = 26;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const sx = (x: number) => pad + ((x - x0) / (x1 - x0 || 1)) * (W - pad - 8);
  const sy = (y: number) => H - 18 - ((y - y0) / (y1 - y0)) * (H - 36);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
  const fmt = (ms: number) => new Date(ms).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric' });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" style={{ direction: 'ltr' }}>
      {[y0, (y0 + y1) / 2, y1].map((y) => (
        <g key={y}>
          <line x1={pad} x2={W - 8} y1={sy(y)} y2={sy(y)} className="grid" />
          <text x={2} y={sy(y) + 3}>{Math.round(y)}</text>
        </g>
      ))}
      <path d={d} className="lineplot" />
      {points.map((p) => <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={3} className="dot" />)}
      <text x={pad} y={H - 2}>{fmt(x0)}</text>
      <text x={W - 8} y={H - 2} textAnchor="end">{fmt(x1)} {unit}</text>
    </svg>
  );
}

export function Bars({ data, max, target }: { data: [string, number][]; max?: number; target?: [number, number] }) {
  const top = max ?? Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="bars">
      {data.map(([label, v]) => {
        const inRange = target ? v >= target[0] && v <= target[1] : true;
        return (
          <div key={label} className="row">
            <span className="label">{label}</span>
            <div className="track"><div className="bar" style={{ width: `${Math.min(100, (v / top) * 100)}%`, opacity: inRange ? 1 : 0.5 }} /></div>
            <span className="val">{Number.isInteger(v) ? v : v.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}
