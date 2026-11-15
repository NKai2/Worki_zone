import { useState } from 'react';
import type { Tab } from '../App';
import { BLOCKS } from '../data/guide';
import { EX } from '../data/exercises';
import { Icon } from '../Icons';
import { useT, type Key } from '../i18n';
import { generatePlan, setsFor, weekInfo } from '../lib/plan';
import { installProgram, type ProgramId } from '../lib/programs';
import { logBodyweight, logSwim, sessionSets, sessionVolume, startWorkout, swimDistance } from '../lib/workout';
import { getState, setState, useStore } from '../store';
import { haptic, LangButton, Rings, Sheet, Stepper, SwimForm } from '../ui';
import SessionSummary, { fmtDuration } from './SessionSummary';

const WEEK = 7 * 864e5;
const SWIM_GOAL = 3000;
const thumb = (id: string) => `${import.meta.env.BASE_URL}thumbs/${id}.webp`;

export default function Today({ go }: { go: (tab: Tab) => void }) {
  const { t, tx, lang } = useT();
  const plan = useStore((s) => s.plan)!;
  const pointer = useStore((s) => s.pointer);
  const history = useStore((s) => s.history);
  const lastBw = useStore((s) => s.bodyweight[s.bodyweight.length - 1]?.kg);
  const [open, setOpen] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'swim' | 'weight' | null>(null);
  const [bw, setBw] = useState(0);

  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const finished = pointer.week > plan.weeks;
  const week = Math.min(pointer.week, plan.weeks);
  const day = plan.days[pointer.dayIndex % plan.days.length];
  const info = weekInfo(plan, week);
  const daySets = day.slots.reduce((n, s) => n + setsFor(s, plan, week), 0);
  const estMin = Math.round(day.slots.reduce((m, s) => m + setsFor(s, plan, week) * (s.rest + 40), 0) / 60 / 5) * 5;

  const recent = history.filter((h) => h.start > Date.now() - WEEK);
  const lifts = recent.filter((h) => h.exercises.length > 0);
  const weekSetsDone = lifts.reduce((n, h) => n + sessionSets(h), 0);
  const weekSetsPlan = plan.days.reduce((n, d) => n + d.slots.reduce((m, s) => m + setsFor(s, plan, week), 0), 0);
  const swim = recent.reduce((d, h) => d + swimDistance(h), 0);
  const weekVolume = lifts.reduce((v, h) => v + sessionVolume(h), 0);

  // Which of this program week's sessions are already done
  const doneThisWeek = new Set(history.filter((h) => h.week === pointer.week && h.start >= plan.createdAt).map((h) => h.dayKey));
  const blockColor = (w: number) => (plan.program ? BLOCKS[weekInfo(plan, w).block].color : 'var(--tint)');

  const newMeso = () => {
    const { profile } = getState();
    if (plan.program) installProgram(plan.program as ProgramId);
    else if (profile) setState({ plan: generatePlan(profile), pointer: { week: 1, dayIndex: 0 } });
  };
  const start = () => { haptic(15); startWorkout(); window.scrollTo(0, 0); };
  const hour = new Date().getHours();
  const greet = t(hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening');

  return (
    <div>
      <header className="home-head">
        <div>
          <div className="date">{new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>{greet}</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <LangButton />
          <button className="nav-btn" onClick={() => go('settings')} aria-label={t('navSettings')}><Icon.gear /></button>
        </div>
      </header>

      {finished ? (
        <section className="hero">
          <h2 style={{ maxWidth: '100%' }}>🎉 {t('mesoDone')}</h2>
          <button className="btn brand block xl mt16" onClick={newMeso}>{t('newMeso')}</button>
        </section>
      ) : (
        <section className="hero">
          <div className="hero-top">
            <div className="grow">
              <div className="eyebrow">
                <span className={`pill ${info.deload ? 'deload' : 'on'}`}>{info.deload ? t('deload') : t('nextWorkout')}</span>
                {plan.program && <span className="pill">{t('block')} {info.block + 1}</span>}
              </div>
              <h2>{t(`day_${day.key}` as Key)}</h2>
              <div className="meta num">{day.slots.length} {t('exercises')} · {daySets} {t('sets')} · ~{estMin} {t('minutes')}</div>
            </div>
            <div className="collage" aria-hidden="true">
              {day.slots.slice(0, 3).map((sl) => <img key={sl.exId} src={thumb(sl.exId)} alt="" />)}
            </div>
          </div>
          <div className="strip">
            {day.slots.map((s, i) => (
              <span key={`${s.exId}-${i}`}><img src={thumb(s.exId)} alt="" />{tx(EX[s.exId].name)}</span>
            ))}
          </div>
          <button className="btn brand block xl" onClick={start}><Icon.play /> {t('startWorkout')}</button>
        </section>
      )}

      <div className="section-h">
        <h2>{t('week')} {week} <span className="secondary" style={{ fontWeight: 600, fontSize: 17 }}>{t('of')} {plan.weeks}</span></h2>
        <button onClick={() => go('plan')}>{t('viewProgram')}</button>
      </div>
      <div className="week-sessions">
        {plan.days.map((d, i) => {
          const done = doneThisWeek.has(d.key);
          const next = !done && i === pointer.dayIndex % plan.days.length;
          return (
            <button key={d.key} className={`ws press-scale ${done ? 'done' : ''} ${next ? 'next' : ''}`} onClick={() => go('plan')}>
              {done && <span className="mark"><Icon.check /></span>}
              <div className="l">{plan.program ? d.key.slice(-1) : i + 1}</div>
              <div className="s">{done ? t('doneShort') : next ? t('nextShort') : t('aheadShort')}</div>
            </button>
          );
        })}
      </div>
      <div className="prog-bar" style={{ gridTemplateColumns: `repeat(${plan.weeks}, 1fr)` }}>
        {Array.from({ length: plan.weeks }, (_, i) => {
          const w = i + 1;
          return <i key={w} style={{ ['--c' as string]: blockColor(w) }} className={`${w < pointer.week ? 'done' : ''} ${w === pointer.week ? 'now' : ''} ${weekInfo(plan, w).deload ? 'deload' : ''}`} />;
        })}
      </div>
      <div className="prog-legend"><span>{t('week')} 1</span><span>{Math.round(((pointer.week - 1) / plan.weeks) * 100)}% {t('completed')}</span><span>{t('week')} {plan.weeks}</span></div>

      <div className="section-h"><h2>{t('activity')}</h2><button onClick={() => go('progress')}>{t('more')}</button></div>
      <div className="card act press-scale" onClick={() => go('progress')} role="button">
        <Rings size={96} values={[lifts.length / plan.days.length, weekSetsDone / Math.max(1, weekSetsPlan), swim / SWIM_GOAL]}
          colors={['var(--ring-move)', 'var(--ring-exercise)', 'var(--ring-swim)']} />
        <div className="nums">
          <div><b style={{ color: 'var(--ring-move)' }}>{lifts.length}/{plan.days.length}</b><span>{t('ringWorkouts')}</span></div>
          <div><b style={{ color: 'var(--ring-exercise)' }}>{weekSetsDone}</b><span>{t('ringSets')}</span></div>
          <div><b style={{ color: 'var(--ring-swim)' }}>{(swim / 1000).toFixed(1)}</b><span>{t('ringSwim')} ({t('km')})</span></div>
        </div>
      </div>
      <div className="group-footer">{t('last7Days')} · {Math.round(weekVolume).toLocaleString()} {t('kg')} {t('lifted')}</div>

      <div className="quick mt16">
        <button className="quick-tile press-scale" onClick={() => setSheet('swim')}>
          <span className="ic" style={{ background: 'var(--cyan)' }}><Icon.swim /></span>
          <b>{t('logSwimShort')}</b>
        </button>
        <button className="quick-tile press-scale" onClick={() => { setBw(lastBw ?? 0); setSheet('weight'); }}>
          <span className="ic" style={{ background: '#5e5ce6' }}><Icon.scale /></span>
          <div>
            <b>{t('quickBw')}</b>
            {lastBw && <div className="footnote secondary num">{lastBw} {t('kg')}</div>}
          </div>
        </button>
      </div>

      {history.length > 0 && (
        <>
          <div className="section-h"><h2>{t('recent')}</h2></div>
          <div className="hscroll">
            {history.slice(-8).reverse().map((h) => {
              const isSwim = h.exercises.length === 0;
              return (
                <button key={h.id} className="recent-card press-scale" onClick={() => setOpen(h.id)}>
                  <div className="d">{new Date(h.start).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtDuration(h.end - h.start)}</div>
                  <div className="t">{isSwim ? `🏊 ${t('day_swim')}` : t(`day_${h.dayKey}` as Key)}</div>
                  <div className="v num" dir="ltr">{isSwim ? <>{swimDistance(h)}<small> m</small></> : <>{Math.round(sessionVolume(h)).toLocaleString()}<small> {t('kg')}</small></>}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {sheet === 'swim' && (
        <Sheet title={t('swim')} onClose={() => setSheet(null)}>
          <SwimForm onSave={(e) => { const sess = logSwim(e); setSheet(null); setOpen(sess.id); }} />
        </Sheet>
      )}
      {sheet === 'weight' && (
        <Sheet title={t('bodyweightTitle')} onClose={() => setSheet(null)}>
          <div className="big-num num" dir="ltr">{bw ? bw.toFixed(1) : '—'}<span className="secondary" style={{ fontSize: 22 }}> {t('kg')}</span></div>
          <div className="mt16"><Stepper value={bw} step={0.1} decimal label={t('kg')} onChange={setBw} /></div>
          <button className="btn filled block mt24" disabled={!bw} onClick={() => { haptic(12); logBodyweight(Math.round(bw * 10) / 10); setSheet(null); }}>{t('save')}</button>
        </Sheet>
      )}
      {open && (
        <Sheet onClose={() => setOpen(null)}>
          <SessionSummary sessionId={open} onClose={() => setOpen(null)} />
        </Sheet>
      )}
    </div>
  );
}
