import { useEffect, useRef, useState } from 'react';
import { EX } from '../data/exercises';
import { Icon } from '../Icons';
import { useT, type Key } from '../i18n';
import { uploadToStrava } from '../integrations/strava';
import { e1rm, increment, lastPerformance, suggest, weekInfo } from '../lib/plan';
import { discardWorkout, finishWorkout, fmtPace, pace, updateActive, updateSession } from '../lib/workout';
import { getState, useStore, type LoggedSet } from '../store';
import { Cell, ExerciseDetail, Group, haptic, NavBar, Sheet, Stepper, SwimForm, Thumb } from '../ui';

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

function RestTimer({ until, total, onChange, onDone }: { until: number; total: number; onChange: (until: number) => void; onDone: () => void }) {
  const { t } = useT();
  const sound = useStore((s) => s.settings.restSound);
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      if (sound) beep();
      setTimeout(() => doneRef.current(), 1200);
    }
    if (left > 0) fired.current = false;
  }, [left, sound]);
  const frac = total ? Math.max(0, (until - now) / 1000 / total) : 0;
  const r = 19, c = 2 * Math.PI * r;
  return (
    <div className="timer-pill" role="timer" aria-live="off">
      <svg className="ring" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="5" />
        <circle cx="23" cy="23" r={r} fill="none" stroke="#30d158" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 23 23)" />
      </svg>
      <div className="grow">
        <div className="lbl">{t('restTimer')}</div>
        <div className="time" dir="ltr">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div>
      </div>
      <button dir="ltr" onClick={() => onChange(until - 15000)}>−15</button>
      <button dir="ltr" onClick={() => onChange(until + 15000)}>+15</button>
      <button className="skip" onClick={onDone}>{t('skip')}</button>
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
  const h = Math.floor(s / 3600);
  return <span dir="ltr" className="num">{h ? `${h}:` : ''}{String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')}:{String(s % 60).padStart(2, '0')}</span>;
}

export default function Workout({ onFinish }: { onFinish: (id: string, prs: string[]) => void }) {
  const { t, tx } = useT();
  const w = useStore((s) => s.active)!;
  const plan = useStore((s) => s.plan)!;
  const history = useStore((s) => s.history);
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [swimOpen, setSwimOpen] = useState(false);
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
  const allSets = w.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <div style={{ paddingBottom: rest ? 96 : 0 }}>
      <NavBar
        title={t(`day_${w.dayKey}` as Key)}
        sub={<span>{t('week')} {w.week} · {t('targetRir')} {rir} · <Elapsed start={w.start} /></span>}
        leading={<button className="nav-text-btn danger" onClick={() => { if (confirm(t('discardConfirm'))) discardWorkout(); }}>{t('cancel')}</button>}
        actions={<button className="btn small filled" disabled={doneSets === 0 && !w.swims?.length} onClick={finish}>{t('finishShort')}</button>}
      />
      <div className="week-track" aria-label={`${doneSets}/${allSets}`}>
        <i className="on" style={{ flex: 'none', width: `${(doneSets / Math.max(1, allSets)) * 100}%`, background: 'var(--green)', transition: 'width .4s var(--ease)' }} />
        <i style={{ flex: 1 }} />
      </div>
      {deload && <div className="hint">{t('deloadWeek')}</div>}

      {w.exercises.map((e, ei) => {
        const ex = EX[e.exId];
        const last = lastPerformance(history, e.exId);
        const s = suggest(history, e, deload);
        const hint: Key = s.kind === 'up' ? 'suggestUp' : s.kind === 'reps' ? 'suggestReps' : s.kind === 'deload' ? 'suggestDeload' : 'suggestFirst';
        const bwEx = ex.load === 'bodyweight';
        const complete = e.sets.every((x) => x.done);
        return (
          <section key={ei} className={`ex-card ${complete ? 'complete' : ''}`}>
            <div className="ex-head">
              <button className="press" onClick={() => setDetail(e.exId)} aria-label={t('howTo')}>
                <Thumb exId={e.exId} />
              </button>
              <div className="grow">
                <div className="name">{tx(ex.name)}{(e.pair || w.exercises[ei - 1]?.pair) && <span className="tag tint" style={{ marginInlineStart: 6 }}>{t('superset')}</span>}</div>
                <div className="footnote secondary num">{e.sets.length} × {e.reps[0] === e.reps[1] ? e.reps[0] : `${e.reps[0]}–${e.reps[1]}`} {e.exId === 'plank' ? t('sec') : t('reps')} · {t('rest')} {e.rest}{t('sec')}</div>
                {e.note && <div className="footnote" style={{ color: 'var(--tint)', fontWeight: 600 }}>{tx(e.note)}</div>}
              </div>
              <button className="icon-btn" onClick={() => setDetail(e.exId)} aria-label={t('howTo')}><Icon.info /></button>
            </div>
            <div className={`hint ${s.kind === 'up' ? 'up' : ''}`}>{t(hint)}</div>
            <div className="set-grid">
              <div className="hd">{t('set')}</div>
              <div className="hd">{bwEx ? `+${t('kg')}` : t('kg')}</div>
              <div className="hd">{e.exId === 'plank' ? t('sec') : t('reps')}</div>
              <div />
              {e.sets.map((set, si) => {
                const p = last?.sets[si];
                return (
                  <div key={si} className={set.done ? 'set-row-done' : ''} style={{ display: 'contents' }}>
                    <div className="set-num">{si + 1}</div>
                    <Stepper value={set.w} step={increment(ex) || 1} decimal label={t('kg')} placeholder={bwEx ? t('bw') : '0'}
                      onChange={(v) => setField(ei, si, { w: v })} />
                    <Stepper value={set.r} step={e.exId === 'plank' ? 5 : 1} label={t('reps')} onChange={(r) => setField(ei, si, { r: Math.round(r) })} />
                    <button className={`check ${set.done ? 'on' : ''}`} onClick={() => { haptic(set.done ? 5 : 15); toggleDone(ei, si); }} aria-pressed={set.done} aria-label={`${t('set')} ${si + 1}`}><Icon.check /></button>
                    {p && <div />}
                    {p && <div className="set-prev" dir="ltr">{t('previous')}: {p.w ? `${p.w} × ${p.r}` : p.r}</div>}
                    {p && <div />}
                  </div>
                );
              })}
            </div>
            <div className="ex-foot">
              <button className="btn small tinted grow" onClick={() => { haptic(); addSet(ei); }}><Icon.plus /> {t('addSetShort')}</button>
              <button className="btn small gray" onClick={() => removeSet(ei)} aria-label={t('remove')}>−</button>
            </div>
          </section>
        );
      })}

      <Group header={t('swim')}>
        {(w.swims ?? []).map((sw, i) => (
          <Cell key={i} icon={<Icon.swim />} iconBg="var(--cyan)"
            title={<span dir="ltr" className="num">{sw.distance} m · {Math.round(sw.duration / 60)} min</span>}
            sub={<>{t(`st_${sw.stroke}` as Key)} · {t('pace100')} <span dir="ltr">{fmtPace(pace(sw))}</span></>}
            trailing={<button className="icon-btn" aria-label={t('remove')} onClick={() => updateActive((a) => ({ ...a, swims: (a.swims ?? []).filter((_, j) => j !== i) }))}><Icon.trash /></button>} />
        ))}
        <Cell title={t('addSwim')} onClick={() => setSwimOpen(true)} />
      </Group>

      <button className="btn filled block mt24" disabled={doneSets === 0 && !w.swims?.length} onClick={finish}>
        {t('finish')}
      </button>

      {rest && <RestTimer until={rest.until} total={rest.total} onChange={(until) => setRest({ ...rest, until })} onDone={() => setRest(null)} />}
      {detail && <Sheet onClose={() => setDetail(null)}><ExerciseDetail exId={detail} /></Sheet>}
      {swimOpen && (
        <Sheet title={t('swim')} onClose={() => setSwimOpen(false)}>
          <SwimForm onSave={(sw) => { updateActive((a) => ({ ...a, swims: [...(a.swims ?? []), sw] })); setSwimOpen(false); }} />
        </Sheet>
      )}
    </div>
  );
}
