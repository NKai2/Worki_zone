import { useState } from 'react';
import type { Tab } from '../App';
import Figure from '../anim/Figure';
import { EX } from '../data/exercises';
import { Icon } from '../Icons';
import { useT, type Key } from '../i18n';
import { generatePlan, setsFor, weekInfo } from '../lib/plan';
import { logBodyweight, logSwim, sessionSets, sessionVolume, startWorkout, swimDistance } from '../lib/workout';
import { getState, setState, useStore } from '../store';
import { Cell, Group, haptic, LangButton, NavBar, Rings, Sheet, Stepper, SwimForm } from '../ui';
import SessionSummary, { fmtDuration } from './SessionSummary';

const WEEK = 7 * 864e5;
const SWIM_GOAL = 3000;

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

  const newMeso = () => {
    const { profile } = getState();
    if (profile) setState({ plan: generatePlan(profile), pointer: { week: 1, dayIndex: 0 } });
  };

  const start = () => { haptic(15); startWorkout(); window.scrollTo(0, 0); };

  return (
    <div>
      <NavBar
        eyebrow={new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        title={t('summaryTitle')}
        actions={<>
          <LangButton />
          <button className="nav-btn" onClick={() => go('settings')} aria-label={t('navSettings')}><Icon.gear /></button>
        </>}
      />

      <div className="card rings-card press-scale" onClick={() => go('progress')} role="button">
        <Rings values={[lifts.length / plan.days.length, weekSetsDone / Math.max(1, weekSetsPlan), swim / SWIM_GOAL]}
          colors={['var(--ring-move)', 'var(--ring-exercise)', 'var(--ring-swim)']} />
        <div className="ring-legend">
          <div>
            <div className="lbl">{t('ringWorkouts')}</div>
            <div className="val" style={{ color: 'var(--ring-move)' }}>{lifts.length}<small>/{plan.days.length}</small></div>
          </div>
          <div>
            <div className="lbl">{t('ringSets')}</div>
            <div className="val" style={{ color: 'var(--ring-exercise)' }}>{weekSetsDone}<small>/{weekSetsPlan}</small></div>
          </div>
          <div>
            <div className="lbl">{t('ringSwim')}</div>
            <div className="val" style={{ color: 'var(--ring-swim)' }}>{(swim / 1000).toFixed(1)}<small>/{SWIM_GOAL / 1000} {t('km')}</small></div>
          </div>
        </div>
      </div>
      <div className="group-footer">{t('last7Days')}</div>

      <h2 className="title2">{finished ? t('newMeso') : t('nextWorkout')}</h2>
      {finished ? (
        <div className="hero-card">
          <div className="title3">🎉 {t('mesoDone')}</div>
          <button className="btn filled block mt16" onClick={newMeso}>{t('newMeso')}</button>
        </div>
      ) : (
        <div className="hero-card">
          <div className="row between">
            <span className={`tag ${info.deload ? 'cyan' : 'tint'}`}>{info.deload ? t('deload') : `${t('week')} ${pointer.week} ${t('of')} ${plan.weeks}`}</span>
            <span className="footnote secondary">{t('targetRir')} {info.rir}</span>
          </div>
          <div className="week-track mt12">
            {Array.from({ length: plan.weeks }, (_, i) => (
              <i key={i} className={`${i + 1 <= pointer.week ? 'on' : ''} ${i + 1 === plan.weeks ? 'deload' : ''}`} />
            ))}
          </div>
          <div className="title3 mt16" style={{ fontSize: 24, fontWeight: 700 }}>{t(`day_${day.key}` as Key)}</div>
          <div className="subhead secondary mt8 num">
            {day.slots.length} {t('exercises')} · {daySets} {t('sets')} · ~{estMin} {t('minutes')}
          </div>
          {info.deload && <div className="hint">{t('deloadWeek')}</div>}
          <div className="thumb-strip">
            {day.slots.map((s) => (
              <div key={s.exId} className="thumb lg" title={tx(EX[s.exId].name)}>
                <Figure anim={EX[s.exId].anim} highlight={EX[s.exId].hl} playing={false} still={0.7} />
              </div>
            ))}
          </div>
          <button className="btn filled block" onClick={start}><Icon.play /> {t('startWorkout')}</button>
        </div>
      )}

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

      <Group header={t('recent')} style={{ marginTop: 8 }}>
        {history.length === 0 && <div className="empty">{t('noHistory')}</div>}
        {history.slice(-6).reverse().map((h) => {
          const isSwim = h.exercises.length === 0;
          return (
            <Cell key={h.id} onClick={() => setOpen(h.id)} chevron
              icon={isSwim ? <Icon.swim /> : <Icon.dumbbell />} iconBg={isSwim ? 'var(--cyan)' : 'var(--orange)'}
              title={isSwim ? t('day_swim') : t(`day_${h.dayKey}` as Key)}
              sub={`${new Date(h.start).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtDuration(h.end - h.start)}${h.stravaId ? ' · Strava' : ''}`}
              detail={<span className="num" dir="ltr">{isSwim ? `${swimDistance(h)} m` : `${Math.round(sessionVolume(h)).toLocaleString()} ${t('kg')}`}</span>}
            />
          );
        })}
      </Group>

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
