import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Figure from './anim/Figure';
import { EX } from './data/exercises';
import { Icon } from './Icons';
import { MUSCLES, useT, type Key } from './i18n';
import { e1rm } from './lib/plan';
import { fmtPace, pace } from './lib/workout';
import { updateSettings, useStore, type Stroke, type SwimEntry } from './store';

/** A light tap where the platform supports it (Android); silently ignored elsewhere. */
export const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch { /* not supported */ } };

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const id = setTimeout(() => done.current(), 2600);
    return () => clearTimeout(id);
  }, [text]);
  return <div className="toast" role="status">{text}</div>;
}

/** Sticky navigation bar whose compact title fades in once the large title scrolls away. */
export function NavBar({ title, eyebrow, sub, actions, leading }: { title: string; eyebrow?: string; sub?: ReactNode; actions?: ReactNode; leading?: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { rootMargin: '-44px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <>
      <div className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        {leading}
        <div className="nav-title">{title}</div>
        <div className="nav-actions">{actions}</div>
      </div>
      <div className="large-title">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
        <div ref={sentinel} style={{ height: 1 }} />
      </div>
    </>
  );
}

export function LangButton() {
  const lang = useStore((s) => s.settings.lang);
  return (
    <button className="nav-btn" aria-label="Language"
      onClick={() => updateSettings({ lang: lang === 'he' ? 'en' : 'he' })}>
      {lang === 'he' ? 'EN' : 'עב'}
    </button>
  );
}

/** Bottom sheet with grabber; drag down or tap outside to dismiss. */
export function Sheet({ children, onClose, title, elev, trailing }: { children: ReactNode; onClose: () => void; title?: string; elev?: boolean; trailing?: ReactNode }) {
  const { t } = useT();
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 260);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if ((sheet.current?.scrollTop ?? 0) <= 0) start.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (start.current === null) return;
    const dy = e.touches[0].clientY - start.current;
    setDrag(Math.max(0, dy));
  };
  const onTouchEnd = () => {
    if (start.current === null) return;
    start.current = null;
    if (drag > 110) close();
    else setDrag(0);
  };

  const style: CSSProperties = drag
    ? { transform: `translateY(${drag}px)`, transition: 'none', ['--drag' as string]: `translateY(${drag}px)` }
    : { transition: 'transform 0.35s var(--ease)' };

  return (
    <div className={`sheet-backdrop ${closing ? 'closing' : ''}`} onClick={close}>
      <div ref={sheet} className={`sheet ${elev ? 'elev' : ''}`} style={style} onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} role="dialog" aria-modal="true">
        <div className="sheet-top">
          <span>{trailing}</span>
          {title && <div className="sheet-title">{title}</div>}
          <button className="icon-btn" onClick={close} aria-label={t('close')}><Icon.close /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Group({ children, header, footer, style }: { children: ReactNode; header?: ReactNode; footer?: ReactNode; style?: CSSProperties }) {
  return (
    <section style={style}>
      {header && <div className="group-header">{header}</div>}
      <div className="group">{children}</div>
      {footer && <div className="group-footer">{footer}</div>}
    </section>
  );
}

interface CellProps {
  title: ReactNode;
  sub?: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  iconBg?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  href?: string;
  inset?: number;
  danger?: boolean;
}

export function Cell({ title, sub, detail, icon, iconBg, leading, trailing, chevron, onClick, href, inset, danger }: CellProps) {
  const content = (
    <>
      {icon && <span className="cell-icon" style={{ background: iconBg ?? 'var(--tint)' }}>{icon}</span>}
      {leading}
      <div className="grow">
        <div className="cell-title" style={danger ? { color: 'var(--red)' } : onClick && !chevron && !trailing && !detail ? { color: 'var(--tint)' } : undefined}>{title}</div>
        {sub && <div className="cell-sub">{sub}</div>}
      </div>
      {detail !== undefined && <span className="detail">{detail}</span>}
      {trailing}
      {chevron && <span className="chev"><Icon.chevron /></span>}
    </>
  );
  const style = inset !== undefined ? ({ ['--inset' as string]: `${inset}px` } as CSSProperties) : icon ? ({ ['--inset' as string]: '58px' } as CSSProperties) : undefined;
  if (href) return <a className="cell" href={href} target="_blank" rel="noreferrer" style={style}>{content}</a>;
  if (onClick) return <button className="cell" onClick={onClick} style={style}>{content}</button>;
  return <div className="cell" style={style}>{content}</div>;
}

export function Segmented<T extends string | number>({ options, value, onChange, lg }: { options: [T, string][]; value: T; onChange: (v: T) => void; lg?: boolean }) {
  return (
    <div className={`segmented ${lg ? 'lg' : ''}`} role="tablist">
      {options.map(([v, label]) => (
        <button key={String(v)} role="tab" aria-selected={v === value} className={v === value ? 'on' : ''} onClick={() => { haptic(5); onChange(v); }}>{label}</button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={(e) => { haptic(5); onChange(e.target.checked); }} />
      <span />
    </label>
  );
}

/** Apple Fitness–style concentric rings. Values are 0..1 (overflow wraps visually capped at 1). */
export function Rings({ values, colors, size = 132 }: { values: number[]; colors: string[]; size?: number }) {
  const stroke = size * 0.105;
  const gap = 2.5;
  return (
    <svg className="rings" viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} aria-hidden="true">
      {values.map((v, i) => {
        const r = size / 2 - stroke / 2 - i * (stroke + gap);
        const c = 2 * Math.PI * r;
        const p = Math.max(0.0001, Math.min(1, v));
        return (
          <g key={i} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle className="track" cx={size / 2} cy={size / 2} r={r} stroke={colors[i]} strokeWidth={stroke} />
            <circle className="arc" cx={size / 2} cy={size / 2} r={r} stroke={colors[i]} strokeWidth={stroke}
              strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
          </g>
        );
      })}
    </svg>
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
  const date = (ms: number) => new Date(ms).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short' });

  return (
    <div>
      <div className="stage">
        <Figure anim={ex.anim} highlight={ex.hl} playing={playing} />
        <button className="icon-btn play" onClick={() => setPlaying(!playing)} aria-label={playing ? t('pause') : t('play')}>
          {playing ? <Icon.pause /> : <Icon.play />}
        </button>
      </div>
      <h2 className="title3" style={{ marginTop: 16, fontSize: 24, fontWeight: 700 }}>{tx(ex.name)}</h2>
      <div className="secondary subhead">{lang === 'he' ? ex.name.en : ex.name.he}</div>
      <div className="row wrap mt12" style={{ gap: 6 }}>
        {ex.muscles.map((m) => <span key={m} className="tag orange">{tx(MUSCLES[m])}</span>)}
        {ex.secondary.map((m) => <span key={m} className="tag">{tx(MUSCLES[m])}</span>)}
      </div>

      <div className="tiles mt16">
        <div className="tile"><div className="k">{t('reps')}</div><div className="v">{ex.reps[0]}–{ex.reps[1]}{ex.id === 'plank' && <small> {t('sec')}</small>}</div></div>
        <div className="tile"><div className="k">{t('rest')}</div><div className="v">{ex.rest}<small> {t('sec')}</small></div></div>
        {best > 0 && <div className="tile"><div className="k">{t('best')} 1RM</div><div className="v">{best.toFixed(0)}<small> {t('kg')}</small></div></div>}
      </div>

      <Group header={t('cues')}>
        <ol className="cues">{ex.cues[lang].map((c) => <li key={c}>{c}</li>)}</ol>
      </Group>
      <Group header={t('mistakes')}>
        <ul className="warn">{ex.mistakes[lang].map((c) => <li key={c}>{c}</li>)}</ul>
      </Group>
      <Group header={t('equipment')} style={{ marginBottom: 4 }}>
        <Cell title={ex.equip.length ? ex.equip.map((e) => t(`eq_${e}` as Key)).join(' · ') : t('noEquipment')} />
        <Cell title={t('watchVideo')} href={yt} icon={<Icon.video />} iconBg="#ff3b30" chevron />
      </Group>

      {log.length > 0 && (
        <Group header={t('history')}>
          {log.map((l) => (
            <Cell key={l.date} title={<span className="num" dir="ltr">{l.sets.map((s) => (s.w ? `${s.w}×${s.r}` : `${s.r}`)).join('   ')}</span>} detail={date(l.date)} />
          ))}
        </Group>
      )}
    </div>
  );
}

export function LineChart({ points, unit = '', fmtY = (y: number) => String(Math.round(y)), color = 'var(--tint)' }: { points: { x: number; y: number }[]; unit?: string; fmtY?: (y: number) => string; color?: string }) {
  const { t, lang } = useT();
  if (points.length < 2) return <div className="empty">{t('noData')}</div>;
  const W = 340, H = 170, padL = 34, padB = 20;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const span = y1 - y0 || 1;
  y0 -= span * 0.12; y1 += span * 0.12;
  const sx = (x: number) => padL + ((x - x0) / (x1 - x0 || 1)) * (W - padL - 10);
  const sy = (y: number) => H - padB - ((y - y0) / (y1 - y0)) * (H - padB - 10);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L${sx(points[points.length - 1].x).toFixed(1)} ${H - padB} L${sx(points[0].x).toFixed(1)} ${H - padB} Z`;
  const fmt = (ms: number) => new Date(ms).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short' });
  const id = `g${Math.round(points[0].x % 1e6)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" style={{ direction: 'ltr' }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => {
        const y = y0 + (y1 - y0) * f;
        return (
          <g key={f}>
            <line x1={padL} x2={W - 10} y1={sy(y)} y2={sy(y)} className="grid" strokeDasharray={f === 0 ? undefined : '2 3'} />
            <text x={0} y={sy(y) + 3}>{fmtY(y)}</text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${id})`} />
      <path d={line} className="lineplot" style={{ stroke: color }} />
      {points.map((p) => <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={3.5} className="dot" style={{ stroke: color }} />)}
      <text x={padL} y={H - 4}>{fmt(x0)}</text>
      <text x={W - 10} y={H - 4} textAnchor="end">{fmt(x1)}{unit ? ` · ${unit}` : ''}</text>
    </svg>
  );
}

export function Bars({ data, max, target }: { data: [string, number][]; max: number; target?: [number, number] }) {
  return (
    <div className="bars">
      {data.map(([label, v]) => {
        const low = target ? v < target[0] : false;
        return (
          <div key={label} className="bar-row">
            <span className="label">{label}</span>
            <div className="track">
              {target && <div className="zone" style={{ insetInlineStart: `${(target[0] / max) * 100}%`, width: `${((target[1] - target[0]) / max) * 100}%` }} />}
              <div className={`bar ${low ? 'low' : ''}`} style={{ width: `${Math.min(100, (v / max) * 100)}%`, position: 'relative' }} />
            </div>
            <span className="val">{Number.isInteger(v) ? v : v.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Compact − value + control for fast logging with one thumb. */
export function Stepper({ value, step, onChange, placeholder, decimal, label }: { value: number; step: number; onChange: (v: number) => void; placeholder?: string; decimal?: boolean; label?: string }) {
  const set = (v: number) => { haptic(4); onChange(Math.max(0, Math.round(v * 100) / 100)); };
  return (
    <div className="stepper" dir="ltr">
      <button type="button" onClick={() => set(value - step)} aria-label={`− ${label ?? ''}`}>−</button>
      <input inputMode={decimal ? 'decimal' : 'numeric'} value={value || ''} placeholder={placeholder ?? '0'} aria-label={label}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value.replace(',', '.')) || 0))} />
      <button type="button" onClick={() => set(value + step)} aria-label={`+ ${label ?? ''}`}>+</button>
    </div>
  );
}

export function SwimForm({ onSave, initial }: { onSave: (e: SwimEntry) => void; initial?: SwimEntry }) {
  const { t } = useT();
  const [e, setE] = useState<SwimEntry>(initial ?? { distance: 1000, duration: 25 * 60, stroke: 'freestyle', pool: 25 });
  const strokes: Stroke[] = ['freestyle', 'breast', 'back', 'fly', 'mixed'];
  const minutes = Math.round((e.duration / 60) * 10) / 10;
  return (
    <div>
      <div className="center">
        <div className="big-num" dir="ltr">{e.distance.toLocaleString()}<span className="secondary" style={{ fontSize: 22 }}> m</span></div>
        <div className="secondary subhead">{t('pace100')} <b className="num" dir="ltr" style={{ color: 'var(--cyan)' }}>{e.distance && e.duration ? fmtPace(pace(e)) : '—'}</b></div>
      </div>
      <div className="chips mt16" style={{ justifyContent: 'center' }}>
        {[500, 1000, 1500, 2000, 3000].map((d) => (
          <button key={d} className={`chip ${e.distance === d ? 'on' : ''}`} onClick={() => { haptic(5); setE({ ...e, distance: d }); }}>{d}</button>
        ))}
      </div>
      <Group header={t('distance')}>
        <div className="cell"><div className="grow"><Stepper value={e.distance} step={50} label={t('distance')} onChange={(distance) => setE({ ...e, distance })} /></div></div>
      </Group>
      <Group header={t('swimTime')}>
        <div className="cell"><div className="grow"><Stepper value={minutes} step={1} decimal label={t('swimTime')} onChange={(m) => setE({ ...e, duration: Math.round(m * 60) })} /></div></div>
      </Group>
      <div className="group-header">{t('stroke')}</div>
      <Segmented options={strokes.map((s) => [s, t(`st_${s}` as Key)] as [Stroke, string])} value={e.stroke} onChange={(stroke) => setE({ ...e, stroke })} />
      <div className="group-header">{t('pool')}</div>
      <Segmented options={[[25, '25 m'], [50, '50 m'], [0, t('openWater')]]} value={e.pool} onChange={(pool) => setE({ ...e, pool: pool as 25 | 50 | 0 })} />
      <button className="btn filled block mt24" disabled={!e.distance || !e.duration} onClick={() => { haptic(12); onSave(e); }}>{t('save')}</button>
    </div>
  );
}
