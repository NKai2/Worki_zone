import { useEffect, useRef, useState } from 'react';
import Figure from '../anim/Figure';
import { EX } from '../data/exercises';
import { Icon } from '../Icons';
import { useT, type Key } from '../i18n';
import { uploadToStrava } from '../integrations/strava';
import { e1rm, lastPerformance, suggest, weekInfo } from '../lib/plan';
import { discardWorkout, finishWorkout, updateActive, updateSession } from '../lib/workout';
import { getState, useStore, type LoggedSet } from '../store';
import { ExerciseDetail, Sheet } from '../ui';

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
    navigator.vibrate?.([200, 100, 200]);
  } catch { /* audio not available */ }
}

function RestBar({ until, total, onChange, onDone }: { until: number; total: number; onChange: (until: number) => void; onDone: () => void }) {
  const { t } = useT();
  const sound = useStore((s) => s.settings.restSound);
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      if (sound) beep();
      setTimeout(() => doneRef.current(), 1500);
    }
    if (left > 0) fired.current = false;
  }, [left, sound]);
  const pct = total ? (left / total) * 100 : 0;
  return (
    <div className="rest-bar" style={{ background: `linear-gradient(90deg, var(--accent) ${100 - pct}%, #a9d12a ${100 - pct}%)` }}>
      <div className="grow">
        <div className="small" style={{ fontWeight: 700 }}>{t('restTimer')}</div>
        <div className="time" dir="ltr">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div>
      </div>
      <button dir="ltr" onClick={() => onChange(until - 15000)}>−15</button>
      <button dir="ltr" onClick={() => onChange(until + 15000)}>+15</button>
      <button onClick={onDone}>{t('skip')}</button>
    </div>
  );
}

function Elapsed({ start }: { start: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.floor((now - start) / 1000);
  return <span dir="ltr">{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>;
}

export default function Workout({ onFinish }: { onFinish: (id: string, prs: string[]) => void }) {
  const { t, tx } = useT();
  const w = useStore((s) => s.active)!;
  const plan = useStore((s) => s.plan)!;
  const history = useStore((s) => s.history);
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const { deload, rir } = weekInfo(plan, w.week);

  const setField = (ei: number, si: number, patch: Partial<LoggedSet>) =>
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) })),
    }));

  const toggleDone = (ei: number, si: number) => {
    const ex = w.exercises[ei];
    const set = ex.sets[si];
    const done = !set.done;
    // Carry the weight forward to the following empty sets
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) => (i !== ei ? e : {
        ...e,
        sets: e.sets.map((s, j) => (j === si ? { ...s, done } : j > si && !s.done && done && s.w === 0 ? { ...s, w: set.w } : s)),
      })),
    }));
    if (done) setRest({ until: Date.now() + ex.rest * 1000, total: ex.rest });
  };

  const addSet = (ei: number) =>
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) => {
        if (i !== ei) return e;
        const last = e.sets[e.sets.length - 1] ?? { w: 0, r: e.reps[0] };
        return { ...e, sets: [...e.sets, { w: last.w, r: last.r, done: false }] };
      }),
    }));

  const removeSet = (ei: number) =>
    updateActive((a) => ({ ...a, exercises: a.exercises.map((e, i) => (i === ei && e.sets.length > 1 ? { ...e, sets: e.sets.slice(0, -1) } : e)) }));

  const finish = async () => {
    const before = getState().history;
    const bestBefore = (id: string) =>
      before.flatMap((h) => h.exercises.filter((e) => e.exId === id).flatMap((e) => e.sets)).reduce((b, s) => Math.max(b, e1rm(s.w, s.r)), 0);
    const session = finishWorkout();
    if (!session) return;
    const prs = session.exercises
      .filter((e) => before.some((h) => h.exercises.some((x) => x.exId === e.exId)))
      .filter((e) => Math.max(...e.sets.map((s) => e1rm(s.w, s.r))) > bestBefore(e.exId))
      .map((e) => e.exId);
    onFinish(session.id, prs);
    const { settings } = getState();
    if (settings.autoStrava && settings.strava) {
      uploadToStrava(session, `Worki Zone · ${t(`day_${session.dayKey}` as Key)}`)
        .then((id) => updateSession(session.id, { stravaId: id }))
        .catch(() => { /* user can retry from the summary */ });
    }
  };

  const doneSets = w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  return (
    <div style={{ paddingBottom: rest ? 90 : 0 }}>
      <div className="row between">
        <div>
          <h1 style={{ marginBottom: 0 }}>{t(`day_${w.dayKey}` as Key)}</h1>
          <div className="muted small">{t('week')} {w.week} · {t('targetRir')} {rir} · <Elapsed start={w.start} /></div>
        </div>
        <button className="btn danger sm" onClick={() => { if (confirm(t('discardConfirm'))) discardWorkout(); }}>{t('discard')}</button>
      </div>
      {deload && <div className="hint">{t('deloadWeek')}</div>}

      {w.exercises.map((e, ei) => {
        const ex = EX[e.exId];
        const last = lastPerformance(history, e.exId);
        const s = suggest(history, e, deload);
        const hint: Key = s.kind === 'up' ? 'suggestUp' : s.kind === 'reps' ? 'suggestReps' : s.kind === 'deload' ? 'suggestDeload' : 'suggestFirst';
        const bwEx = ex.load === 'bodyweight';
        return (
          <section key={ei} className="ex-block">
            <div className="ex-head">
              <button className="thumb" style={{ border: 0, padding: 0 }} onClick={() => setDetail(e.exId)} aria-label={t('howTo')}>
                <Figure anim={ex.anim} highlight={ex.hl} playing={false} still={0.7} />
              </button>
              <div className="grow">
                <b>{tx(ex.name)}</b>
                <div className="muted small">{e.sets.length} × {e.reps[0]}-{e.reps[1]} {e.exId === 'plank' ? t('seconds') : t('reps')} · {t('rest')} {e.rest}{t('sec')}</div>
              </div>
              <button className="icon-btn" onClick={() => setDetail(e.exId)} aria-label={t('howTo')}><Icon.info /></button>
            </div>
            <div className="hint">{t(hint)}</div>
            <table className="sets">
              <thead>
                <tr>
                  <th>{t('set')}</th>
                  <th>{t('previous')}</th>
                  <th>{bwEx ? `+${t('kg')}` : t('kg')}</th>
                  <th>{e.exId === 'plank' ? t('sec') : t('reps')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {e.sets.map((set, si) => {
                  const p = last?.sets[si];
                  return (
                    <tr key={si} className={set.done ? 'done' : ''}>
                      <td>{si + 1}</td>
                      <td className="prev" dir="ltr">{p ? (p.w ? `${p.w}×${p.r}` : `${p.r}`) : '—'}</td>
                      <td>
                        <input inputMode="decimal" value={set.w || ''} placeholder={bwEx ? t('bw') : '0'}
                          onChange={(ev) => setField(ei, si, { w: parseFloat(ev.target.value.replace(',', '.')) || 0 })} />
                      </td>
                      <td>
                        <input inputMode="numeric" value={set.r || ''} placeholder="0"
                          onChange={(ev) => setField(ei, si, { r: parseInt(ev.target.value, 10) || 0 })} />
                      </td>
                      <td>
                        <button className={`check ${set.done ? 'on' : ''}`} onClick={() => toggleDone(ei, si)} aria-label="done"><Icon.check /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="row" style={{ marginTop: 8, gap: 6 }}>
              <button className="btn sm ghost grow" onClick={() => addSet(ei)}>{t('addSet')}</button>
              <button className="btn sm ghost" onClick={() => removeSet(ei)}>−</button>
            </div>
          </section>
        );
      })}

      <button className="btn primary block" style={{ marginTop: 18 }} disabled={doneSets === 0} onClick={finish}>
        {t('finish')} ({doneSets})
      </button>

      {rest && <RestBar until={rest.until} total={rest.total} onChange={(until) => setRest({ ...rest, until })} onDone={() => setRest(null)} />}
      {detail && <Sheet onClose={() => setDetail(null)}><ExerciseDetail exId={detail} /></Sheet>}
    </div>
  );
}
