import { useEffect, useRef, useState } from 'react';
import { EX } from '../data/exercises';
import { Icon } from '../Icons';
import { useT, type Key } from '../i18n';
import { uploadToStrava } from '../integrations/strava';
import { alternatives, e1rm, increment, lastPerformance, patternOf, suggest, weekInfo } from '../lib/plan';
import { discardWorkout, finishWorkout, fmtPace, pace, updateActive, updateSession } from '../lib/workout';
import { getState, setState, useStore, type LoggedSet } from '../store';
import { Cell, ExerciseDetail, Group, haptic, Sheet, Switch, SwimForm, Thumb } from '../ui';

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

type Swap = { ei: number } | null;

export default function Workout({ onFinish }: { onFinish: (id: string, prs: string[]) => void }) {
  const { t, tx } = useT();
  const w = useStore((s) => s.active)!;
  const plan = useStore((s) => s.plan)!;
  const profile = useStore((s) => s.profile);
  const history = useStore((s) => s.history);
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'list' | 'swim' | null>(null);
  const [swap, setSwap] = useState<Swap>(null);
  const [swapPlanToo, setSwapPlanToo] = useState(true);
  const [extraWeight, setExtraWeight] = useState(false);
  const { deload, rir } = weekInfo(plan, w.week);

  const cur = Math.min(w.cur ?? 0, w.exercises.length - 1);
  const e = w.exercises[cur];
  const ex = EX[e.exId];
  const si = e.sets.findIndex((x) => !x.done);
  const exDone = si === -1;
  const set = exDone ? null : e.sets[si];
  const bw = ex.load === 'bodyweight';
  const secs = e.exId === 'plank';
  const last = lastPerformance(history, e.exId);
  const sug = suggest(history, e, deload);
  const doneSets = w.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0);
  const allDone = w.exercises.every((x) => x.sets.every((s) => s.done));
  const pairedNext = e.pair && w.exercises[cur + 1];
  const pairedPrev = w.exercises[cur - 1]?.pair ? w.exercises[cur - 1] : null;

  const go = (i: number) => { updateActive((a) => ({ ...a, cur: Math.max(0, Math.min(a.exercises.length - 1, i)) })); setExtraWeight(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const nextOpen = (from: number) => {
    for (let k = 1; k <= w.exercises.length; k++) {
      const i = (from + k) % w.exercises.length;
      if (w.exercises[i].sets.some((s) => !s.done)) return i;
    }
    return from;
  };

  const patchSet = (patch: Partial<LoggedSet>) =>
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((x, i) => (i !== cur ? x : { ...x, sets: x.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) })),
    }));

  const completeSet = () => {
    if (!set) return;
    haptic(18);
    // Mark done and carry the weight/reps to the remaining sets of this exercise
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((x, i) => (i !== cur ? x : {
        ...x,
        sets: x.sets.map((s, j) => (j === si ? { ...s, done: true } : j > si && !s.done ? { ...s, w: set.w, r: s.r || set.r } : s)),
      })),
    }));
    const remaining = e.sets.filter((s) => !s.done).length - 1;
    if (pairedNext && pairedNext.sets.some((s) => !s.done)) { go(cur + 1); return; } // superset: straight to the partner
    setRest({ until: Date.now() + e.rest * 1000, total: e.rest });
    if (pairedPrev && pairedPrev.sets.some((s) => !s.done)) go(cur - 1);
    else if (remaining <= 0) go(nextOpen(cur));
  };

  const undoSet = (j: number) =>
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((x, i) => (i !== cur ? x : { ...x, sets: x.sets.map((s, k) => (k === j ? { ...s, done: false } : s)) })),
    }));

  /** Remove the last set that has not been done yet (an exercise keeps at least one set). */
  const removeSet = () =>
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((x, i) => {
        if (i !== cur || x.sets.length <= 1) return x;
        const j = x.sets.map((q) => q.done).lastIndexOf(false);
        return j === -1 ? x : { ...x, sets: x.sets.filter((_, k) => k !== j) };
      }),
    }));

  /** Back to bodyweight only: clear the added weight from this and the remaining sets. */
  const removeWeight = () => {
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((x, i) => (i !== cur ? x : { ...x, sets: x.sets.map((q) => (q.done ? q : { ...q, w: 0 })) })),
    }));
    setExtraWeight(false);
  };

  const addSet = () =>
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((x, i) => {
        if (i !== cur) return x;
        const lastSet = x.sets[x.sets.length - 1] ?? { w: 0, r: x.reps[0] };
        return { ...x, sets: [...x.sets, { w: lastSet.w, r: lastSet.r, done: false }] };
      }),
    }));

  const skip = () => {
    // Drop the sets that were not done; keep any that were
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((x, i) => (i !== cur ? x : { ...x, sets: x.sets.filter((s) => s.done).length ? x.sets.filter((s) => s.done) : x.sets.map((s) => ({ ...s, done: false })), skipped: !x.sets.some((s) => s.done) })),
    }));
    go(nextOpen(cur));
  };

  const doSwap = (newId: string) => {
    if (!swap) return;
    const old = w.exercises[swap.ei];
    const nex = EX[newId];
    const s2 = suggest(history, { exId: newId, reps: old.reps }, deload);
    const fresh = (n: number) => Array.from({ length: n }, () => ({ w: s2.w, r: s2.r, done: false }));
    const done = old.sets.filter((s) => s.done);
    const open = old.sets.length - done.length;
    updateActive((a) => {
      const list = [...a.exercises];
      const repl = { ...old, exId: newId, rest: old.rest || nex.rest, note: null, sets: fresh(Math.max(1, open)) };
      if (done.length) list.splice(swap.ei, 1, { ...old, sets: done, pair: false }, repl); // keep what was done, continue with the new exercise
      else list.splice(swap.ei, 1, repl);
      return { ...a, exercises: list, cur: done.length ? swap.ei + 1 : swap.ei };
    });
    if (swapPlanToo) {
      const p = getState().plan!;
      const days = p.days.map((d, di) => (di !== w.dayIndex ? d : {
        ...d, slots: d.slots.map((sl) => (sl.exId === old.exId ? { ...sl, exId: newId, pattern: patternOf(newId) } : sl)),
      }));
      setState({ plan: { ...p, days } });
    }
    setSwap(null);
    haptic(10);
  };

  const finish = async () => {
    const before = getState().history;
    const bestBefore = (id: string) =>
      before.flatMap((h) => h.exercises.filter((x) => x.exId === id).flatMap((x) => x.sets)).reduce((b, s) => Math.max(b, e1rm(s.w, s.r)), 0);
    const session = finishWorkout();
    if (!session) return;
    const prs = session.exercises
      .filter((x) => before.some((h) => h.exercises.some((y) => y.exId === x.exId)))
      .filter((x) => Math.max(...x.sets.map((s) => e1rm(s.w, s.r))) > bestBefore(x.exId))
      .map((x) => x.exId);
    onFinish(session.id, prs);
    const { settings } = getState();
    if (settings.autoStrava && settings.strava) {
      uploadToStrava(session, `Worki Zone · ${t(`day_${session.dayKey}` as Key)}`)
        .then((id) => updateSession(session.id, { stravaId: id }))
        .catch(() => { /* user can retry from the summary */ });
    }
  };

  const fmt = (x: { w: number; r: number }) => (x.w ? `${x.w} × ${x.r}` : `${x.r}${secs ? ` ${t('sec')}` : ''}`);
  const hint = sug.kind === 'up' ? `${t('suggestUpShort')} ${sug.w} ${t('kg')}` : last ? `${t('lastTime')}: ${fmt(last.sets[Math.min(si < 0 ? 0 : si, last.sets.length - 1)])}` : bw ? null : t('suggestFirstShort');
  const swapOptions = swap ? alternatives(w.exercises[swap.ei].exId, patternOf(w.exercises[swap.ei].exId), profile?.equipment ?? ['barbell', 'dumbbell', 'machine', 'cable', 'bench', 'pullup']) : [];

  return (
    <div className="wk" style={{ paddingBottom: rest ? 100 : 24 }}>
      <div className="wk-top">
        <button className="nav-text-btn danger" onClick={() => { if (confirm(t('discardConfirm'))) discardWorkout(); }}>{t('cancel')}</button>
        <button className="wk-title" onClick={() => setSheet('list')}>
          <b>{t('exerciseOf').replace('{a}', String(cur + 1)).replace('{b}', String(w.exercises.length))}</b>
          <span className="secondary"><Elapsed start={w.start} /> · {t('allExercises')} ▾</span>
        </button>
        <button className="btn small filled" disabled={doneSets === 0 && !w.swims?.length} onClick={finish}>{t('finishShort')}</button>
      </div>

      <div className="wk-progress">
        {w.exercises.map((x, i) => {
          const d = x.sets.filter((s) => s.done).length;
          return <button key={i} aria-label={tx(EX[x.exId].name)} onClick={() => go(i)}
            className={`${i === cur ? 'cur' : ''} ${d === x.sets.length ? 'done' : d ? 'part' : ''}`} />;
        })}
      </div>
      {deload && <div className="hint">{t('deloadWeek')}</div>}

      <section className="wk-hero">
        <button className="wk-img press" onClick={() => setDetail(e.exId)} aria-label={t('howTo')}>
          <Thumb exId={e.exId} lg />
          <span className="wk-play"><Icon.play /></span>
        </button>
        <div className="grow">
          {(e.pair || pairedPrev) && <span className="tag tint">{t('superset')}</span>}
          <h1 className="wk-name">{tx(ex.name)}</h1>
          <div className="subhead secondary num">
            {exDone ? t('exerciseDone') : <>{t('set')} {si + 1} {t('of')} {e.sets.length} · {e.reps[0] === e.reps[1] ? e.reps[0] : `${e.reps[0]}–${e.reps[1]}`} {secs ? t('sec') : t('reps')}</>}
            {' · '}RIR {rir}
          </div>
          {e.note && <div className="footnote tint" style={{ fontWeight: 600, marginTop: 2 }}>{tx(e.note)}</div>}
        </div>
      </section>

      {set ? (
        <section className="wk-panel">
          {hint && <div className={`wk-hint ${sug.kind === 'up' ? 'up' : ''}`}>{hint}</div>}
          <div className="wk-inputs">
            {(!bw || extraWeight || set.w > 0) && (
              <BigStepper label={bw ? `+${t('kg')}` : t('kg')} value={set.w} step={increment(ex) || 1} decimal onChange={(v) => patchSet({ w: v })}
                onRemove={bw ? removeWeight : undefined} removeLabel={t('removeWeight')} />
            )}
            <BigStepper label={secs ? t('seconds') : t('reps')} value={set.r} step={secs ? 5 : 1} onChange={(v) => patchSet({ r: Math.round(v) })} />
          </div>
          {bw && !extraWeight && set.w === 0 && <button className="btn plain block" style={{ height: 32 }} onClick={() => setExtraWeight(true)}>+ {t('addWeight')}</button>}
          <button className="btn green block wk-done" onClick={completeSet}><Icon.check /> {t('doneSet')} {si + 1}</button>
        </section>
      ) : allDone ? (
        <section className="wk-panel center">
          <div className="title3">🎉 {t('allDone')}</div>
          <button className="btn filled block mt16" onClick={finish}>{t('finish')}</button>
        </section>
      ) : (
        <section className="wk-panel center">
          <div className="subhead secondary">{t('exerciseDone')}</div>
          <button className="btn filled block mt12" onClick={() => go(nextOpen(cur))}>{t('nextExercise')} ›</button>
        </section>
      )}

      {e.sets.some((s) => s.done) && (
        <div className="wk-sets">
          {e.sets.map((s, j) => s.done && (
            <button key={j} className="wk-set" onClick={() => undoSet(j)} title={t('tapToEdit')}>
              <span className="n">{j + 1}</span><span className="num" dir="ltr">{fmt(s)}</span><Icon.check />
            </button>
          ))}
        </div>
      )}

      <div className="wk-actions">
        <button onClick={() => setSwap({ ei: cur })}><Icon.swap />{t('swapExercise')}</button>
        <div className="wk-count">
          <span className="lbl">{t('setsCount')}</span>
          <div className="ctl" dir="ltr">
            <button onClick={() => { haptic(6); removeSet(); }} disabled={e.sets.length <= 1 || e.sets.every((q) => q.done)} aria-label={t('removeSet')}>−</button>
            <b className="num">{e.sets.length}</b>
            <button onClick={() => { haptic(6); addSet(); }} aria-label={t('addSetShort')}>+</button>
          </div>
        </div>
        <button onClick={skip}><span style={{ fontSize: 18, lineHeight: 1 }}>»</span>{t('skip')}</button>
      </div>

      <div className="wk-nav">
        <button className="btn plain" disabled={cur === 0} onClick={() => go(cur - 1)}>‹ {t('prev')}</button>
        <button className="btn plain" disabled={cur === w.exercises.length - 1} onClick={() => go(cur + 1)}>{t('next')} ›</button>
      </div>

      {rest && <RestTimer until={rest.until} total={rest.total} onChange={(until) => setRest({ ...rest, until })} onDone={() => setRest(null)} />}
      {detail && <Sheet onClose={() => setDetail(null)}><ExerciseDetail exId={detail} /></Sheet>}

      {sheet === 'list' && (
        <Sheet title={t('allExercises')} onClose={() => setSheet(null)}>
          <Group>
            {w.exercises.map((x, i) => {
              const d = x.sets.filter((s) => s.done).length;
              return (
                <Cell key={i} leading={<Thumb exId={x.exId} />} inset={80} onClick={() => { go(i); setSheet(null); }}
                  title={<>{tx(EX[x.exId].name)}{x.pair && <span className="tag tint" style={{ marginInlineStart: 6 }}>{t('superset')}</span>}</>}
                  sub={`${d}/${x.sets.length} ${t('sets')}`}
                  trailing={d === x.sets.length ? <span className="check-mark" style={{ color: 'var(--green)' }}><Icon.check /></span> : i === cur ? <span className="tag tint">{t('now')}</span> : undefined} />
              );
            })}
          </Group>
          <Group header={t('swim')}>
            {(w.swims ?? []).map((sw, i) => (
              <Cell key={i} icon={<Icon.swim />} iconBg="var(--cyan)" title={<span dir="ltr" className="num">{sw.distance} m · {Math.round(sw.duration / 60)} min</span>}
                sub={<>{t(`st_${sw.stroke}` as Key)} · <span dir="ltr">{fmtPace(pace(sw))}</span>/100m</>}
                trailing={<button className="icon-btn" aria-label={t('remove')} onClick={() => updateActive((a) => ({ ...a, swims: (a.swims ?? []).filter((_, j) => j !== i) }))}><Icon.trash /></button>} />
            ))}
            <Cell title={t('addSwim')} onClick={() => setSheet('swim')} />
          </Group>
        </Sheet>
      )}
      {sheet === 'swim' && (
        <Sheet title={t('swim')} onClose={() => setSheet(null)}>
          <SwimForm onSave={(sw) => { updateActive((a) => ({ ...a, swims: [...(a.swims ?? []), sw] })); setSheet(null); }} />
        </Sheet>
      )}
      {swap && (
        <Sheet title={t('swapExercise')} onClose={() => setSwap(null)}>
          <div className="subhead secondary center" style={{ marginBottom: 10 }}>
            {t('swapInstead')} <b style={{ color: 'var(--label)' }}>{tx(EX[w.exercises[swap.ei].exId].name)}</b>
          </div>
          <Group footer={w.exercises[swap.ei].sets.some((s) => s.done) ? t('swapKeepsDone') : undefined}>
            {swapOptions.map((o) => (
              <Cell key={o.id} leading={<Thumb exId={o.id} />} inset={80} onClick={() => doSwap(o.id)} chevron
                title={tx(o.name)} sub={o.equip.length ? o.equip.map((q) => t(`eq_${q}` as Key)).join(' · ') : t('noEquipment')} />
            ))}
          </Group>
          <Group style={{ marginTop: 16 }}>
            <Cell title={t('swapPlanToo')} trailing={<Switch checked={swapPlanToo} onChange={setSwapPlanToo} label={t('swapPlanToo')} />} />
          </Group>
        </Sheet>
      )}
    </div>
  );
}

function BigStepper({ label, value, step, onChange, decimal, onRemove, removeLabel }: { label: string; value: number; step: number; onChange: (v: number) => void; decimal?: boolean; onRemove?: () => void; removeLabel?: string }) {
  const set = (v: number) => { haptic(6); onChange(Math.max(0, Math.round(v * 100) / 100)); };
  return (
    <div className="big-stepper">
      <div className="lbl">
        {label}
        {onRemove && <button type="button" className="lbl-x" onClick={onRemove} aria-label={removeLabel}>✕ {removeLabel}</button>}
      </div>
      <div className="row-in" dir="ltr">
        <button type="button" onClick={() => set(value - step)} aria-label={`− ${label}`}>−</button>
        <input inputMode={decimal ? 'decimal' : 'numeric'} value={value || ''} placeholder="0" aria-label={label}
          onFocus={(ev) => ev.target.select()}
          onChange={(ev) => onChange(Math.max(0, parseFloat(ev.target.value.replace(',', '.')) || 0))} />
        <button type="button" onClick={() => set(value + step)} aria-label={`+ ${label}`}>+</button>
      </div>
    </div>
  );
}
