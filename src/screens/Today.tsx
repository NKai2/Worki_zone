import { useState } from 'react';
import Figure from '../anim/Figure';
import { EX } from '../data/exercises';
import { useT, type Key } from '../i18n';
import { generatePlan, setsFor, weekInfo } from '../lib/plan';
import { logBodyweight, logSwim, sessionVolume, startWorkout, swimDistance } from '../lib/workout';
import { getState, setState, useStore } from '../store';
import { Sheet, Stepper, SwimForm } from '../ui';
import SessionSummary, { fmtDuration } from './SessionSummary';

const WEEK = 7 * 864e5;

export default function Today({ go }: { go: (tab: 'plan') => void }) {
  const { t, tx, lang } = useT();
  const plan = useStore((s) => s.plan)!;
  const pointer = useStore((s) => s.pointer);
  const history = useStore((s) => s.history);
  const [open, setOpen] = useState<string | null>(null);

  const finished = pointer.week > plan.weeks;
  const day = plan.days[pointer.dayIndex % plan.days.length];
  const info = weekInfo(plan, Math.min(pointer.week, plan.weeks));
  const totalSets = day.slots.reduce((n, s) => n + setsFor(s, plan, pointer.week), 0);

  const recentWeek = history.filter((h) => h.start > Date.now() - WEEK && h.dayKey !== 'swim');
  const weekSwim = history.filter((h) => h.start > Date.now() - WEEK).reduce((d, h) => d + swimDistance(h), 0);
  const lastBw = useStore((s) => s.bodyweight[s.bodyweight.length - 1]?.kg);
  const [bw, setBw] = useState(0);
  const [swimOpen, setSwimOpen] = useState(false);
  const [flash, setFlash] = useState('');
  const weekVolume = recentWeek.reduce((v, h) => v + sessionVolume(h), 0);

  // consecutive weeks (rolling 7-day windows) that contain at least one workout
  let streak = 0;
  for (let i = 0; ; i++) {
    const from = Date.now() - (i + 1) * WEEK, to = Date.now() - i * WEEK;
    if (history.some((h) => h.start > from && h.start <= to)) streak++;
    else break;
  }

  const newMeso = () => {
    const { profile } = getState();
    if (profile) setState({ plan: generatePlan(profile), pointer: { week: 1, dayIndex: 0 } });
  };

  return (
    <div>
      <h1>{t('hello')}</h1>

      {finished ? (
        <div className="card hero" style={{ marginTop: 12 }}>
          <h2 style={{ marginTop: 0 }}>🎉 {t('mesoDone')}</h2>
          <button className="btn primary block" onClick={newMeso}>{t('newMeso')}</button>
        </div>
      ) : (
        <div className="card hero" style={{ marginTop: 12 }}>
          <div className="row between">
            <span className="pill accent">{t('nextWorkout')}</span>
            <span className="muted small">{t('week')} {pointer.week} {t('of')} {plan.weeks}</span>
          </div>
          <div className="week-dots" style={{ margin: '12px 0' }}>
            {Array.from({ length: plan.weeks }, (_, i) => (
              <i key={i} className={`${i + 1 <= pointer.week ? 'on' : ''} ${i + 1 === plan.weeks ? 'deload' : ''}`} />
            ))}
          </div>
          <h2 style={{ margin: '4px 0' }}>{t(`day_${day.key}` as Key)}</h2>
          <div className="muted small">
            {day.slots.length} {t('exercises')} · {totalSets} {t('sets')} · {t('targetRir')} {info.rir}
          </div>
          {info.deload && <div className="hint">{t('deloadWeek')}</div>}

          <div className="row" style={{ gap: 6, margin: '14px 0', overflowX: 'auto' }}>
            {day.slots.map((s) => (
              <div key={s.exId} className="thumb" title={tx(EX[s.exId].name)}>
                <Figure anim={EX[s.exId].anim} highlight={EX[s.exId].hl} playing={false} still={0.7} />
              </div>
            ))}
          </div>
          <button className="btn primary block" onClick={startWorkout}>{t('startWorkout')}</button>
          <button className="btn ghost block" style={{ marginTop: 8 }} onClick={() => go('plan')}>{t('planTitle')}</button>
        </div>
      )}

      <div className="row" style={{ marginTop: 12, gap: 8 }}>
        <button className="btn ghost grow" onClick={() => setSwimOpen(true)}>{t('logSwim')}</button>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row between">
          <b>{t('quickBw')}</b>
          {flash && <span className="pill accent">{flash}</span>}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <div className="grow"><Stepper value={bw || lastBw || 0} step={0.1} decimal placeholder={t('kg')} onChange={setBw} /></div>
          <button className="btn primary" onClick={() => { const kg = bw || lastBw; if (kg) { logBodyweight(kg); setBw(0); setFlash(t('saved')); setTimeout(() => setFlash(''), 2000); } }}>{t('save')}</button>
        </div>
      </div>

      <h2>{t('thisWeek')}</h2>
      <div className="stats">
        <div className="stat"><b>{recentWeek.length}/{plan.days.length}</b><span>{t('workouts')}</span></div>
        <div className="stat"><b>{Math.round(weekVolume).toLocaleString()}</b><span>{t('volume')}</span></div>
        <div className="stat"><b>{weekSwim ? `${(weekSwim / 1000).toFixed(1)}` : streak}</b><span>{weekSwim ? `${t('swimThisWeek')} (${t('km')})` : t('streak')}</span></div>
      </div>

      <h2>{t('recent')}</h2>
      {history.length === 0 && <div className="muted small">{t('noHistory')}</div>}
      {history.slice(-6).reverse().map((h) => (
        <button key={h.id} className="list-item" onClick={() => setOpen(h.id)}>
          <div className="grow">
            <b>{h.dayKey === 'swim' ? `🏊 ${t('day_swim')}` : t(`day_${h.dayKey}` as Key)}</b>
            <div className="muted small">
              {new Date(h.start).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              {' · '}{fmtDuration(h.end - h.start)}
              {h.exercises.length > 0 && <>{' · '}{Math.round(sessionVolume(h)).toLocaleString()} {t('kg')}</>}
              {h.swims?.length ? <>{' · '}<span dir="ltr">🏊 {swimDistance(h)} m</span></> : null}
            </div>
          </div>
          {h.stravaId && <span className="pill" style={{ color: 'var(--strava)' }}>Strava</span>}
        </button>
      ))}

      {swimOpen && (
        <Sheet onClose={() => setSwimOpen(false)}>
          <SwimForm onSave={(e) => { const sess = logSwim(e); setSwimOpen(false); setOpen(sess.id); }} />
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
