import { useState } from 'react';
import Figure from '../anim/Figure';
import { EX, EXERCISES } from '../data/exercises';
import type { Muscle } from '../data/types';
import { Icon } from '../Icons';
import { MUSCLES, useT, type Key } from '../i18n';
import { alternatives, available, makeSlot, patternOf, setsFor, weekInfo, weeklySetsPerMuscle } from '../lib/plan';
import { getState, setState, useStore, type Slot } from '../store';
import { Bars, ExerciseDetail, Sheet } from '../ui';

type Target = { day: number; slot: number } | { day: number; slot: -1 };

export default function PlanScreen({ onRebuild }: { onRebuild: () => void }) {
  const { t, tx } = useT();
  const plan = useStore((s) => s.plan)!;
  const profile = useStore((s) => s.profile)!;
  const pointer = useStore((s) => s.pointer);
  const [swap, setSwap] = useState<Target | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const week = Math.min(pointer.week, plan.weeks);
  const info = weekInfo(plan, week);

  const editSlot = (day: number, slot: number, fn: (s: Slot) => Slot | null) => {
    const p = getState().plan!;
    const days = p.days.map((d, i) => {
      if (i !== day) return d;
      const slots = d.slots.map((s, j) => (j === slot ? fn(s) : s)).filter(Boolean) as Slot[];
      return { ...d, slots };
    });
    setState({ plan: { ...p, days } });
  };

  const choose = (exId: string) => {
    if (!swap) return;
    const ex = EX[exId];
    if (swap.slot === -1) {
      const p = getState().plan!;
      const days = p.days.map((d, i) => (i === swap.day ? { ...d, slots: [...d.slots, makeSlot(ex, patternOf(ex.id), profile.experience)] } : d));
      setState({ plan: { ...p, days } });
    } else {
      editSlot(swap.day, swap.slot, (s) => ({ ...s, exId, pattern: patternOf(exId), reps: ex.reps, rest: ex.rest }));
    }
    setSwap(null);
  };

  const volume = weeklySetsPerMuscle(plan.days.flatMap((d) => d.slots.map((s) => ({ exId: s.exId, sets: setsFor(s, plan, week) }))));
  const order: Muscle[] = ['chest', 'back', 'shoulders', 'rearDelts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];

  const options = swap
    ? swap.slot === -1
      ? EXERCISES.filter((e) => available(e, profile.equipment))
      : alternatives(plan.days[swap.day].slots[swap.slot].exId, plan.days[swap.day].slots[swap.slot].pattern, profile.equipment)
    : [];

  return (
    <div>
      <h1>{t('planTitle')}</h1>
      <div className="muted small">
        {t('mesocycle')} {plan.weeks} {t('weeks')} · {plan.days.length} {t('daysPerWeek')} · {t('week')} {week} · {t('targetRir')} {info.rir}
      </div>
      <div className="muted small" style={{ marginTop: 4 }}>{t('rirExplain')}</div>

      {plan.days.map((d, di) => (
        <section key={di} className="card" style={{ marginTop: 14 }}>
          <div className="row between">
            <h3 style={{ margin: 0 }}>{di + 1}. {t(`day_${d.key}` as Key)}</h3>
            {pointer.dayIndex === di && <span className="pill accent">{t('nextWorkout')}</span>}
          </div>
          {d.slots.map((s, si) => {
            const ex = EX[s.exId];
            return (
              <div key={si} className="row" style={{ marginTop: 10 }}>
                <button className="thumb" style={{ border: 0, padding: 0 }} onClick={() => setDetail(s.exId)} aria-label={t('howTo')}>
                  <Figure anim={ex.anim} highlight={ex.hl} playing={false} still={0.7} />
                </button>
                <div className="grow">
                  <button onClick={() => setDetail(s.exId)} style={{ background: 'none', border: 0, padding: 0, textAlign: 'start', fontWeight: 700 }}>
                    {tx(ex.name)}
                  </button>
                  <div className="muted small">
                    {setsFor(s, plan, week)} × {s.reps[0]}-{s.reps[1]} · {t('rest')} {s.rest}{t('sec')}
                  </div>
                  <div className="row" style={{ gap: 4, marginTop: 4 }}>
                    <button className="btn sm ghost" onClick={() => editSlot(di, si, (x) => ({ ...x, sets: Math.max(1, x.sets - 1) }))}>−</button>
                    <button className="btn sm ghost" onClick={() => editSlot(di, si, (x) => ({ ...x, sets: Math.min(8, x.sets + 1) }))}>+</button>
                    <button className="btn sm ghost" onClick={() => setSwap({ day: di, slot: si })}><Icon.swap /> {t('swap')}</button>
                    <button className="btn sm ghost" onClick={() => editSlot(di, si, () => null)} aria-label={t('remove')}><Icon.trash /></button>
                  </div>
                </div>
              </div>
            );
          })}
          <button className="btn sm ghost block" style={{ marginTop: 12 }} onClick={() => setSwap({ day: di, slot: -1 })}>+ {t('addExercise')}</button>
        </section>
      ))}

      <h2>{t('weeklyVolume')}</h2>
      <div className="card">
        <Bars data={order.filter((m) => volume[m]).map((m) => [tx(MUSCLES[m]), volume[m]!])} max={24} target={[10, 20]} />
        <div className="muted small" style={{ marginTop: 10 }}>{t('volumeHint')}</div>
      </div>

      <button className="btn ghost block" style={{ marginTop: 16 }} onClick={() => { if (confirm(t('rebuildConfirm'))) onRebuild(); }}>
        {t('rebuild')}
      </button>

      {swap && (
        <Sheet onClose={() => setSwap(null)}>
          <h2 style={{ marginTop: 0 }}>{swap.slot === -1 ? t('addExercise') : t('swapTitle')}</h2>
          {options.map((e) => (
            <button key={e.id} className="list-item" onClick={() => choose(e.id)}>
              <div className="thumb"><Figure anim={e.anim} highlight={e.hl} playing={false} still={0.7} /></div>
              <div className="grow">
                <b>{tx(e.name)}</b>
                <div className="muted small">{e.muscles.map((m) => tx(MUSCLES[m])).join(' · ')}</div>
              </div>
            </button>
          ))}
        </Sheet>
      )}
      {detail && <Sheet onClose={() => setDetail(null)}><ExerciseDetail exId={detail} /></Sheet>}
    </div>
  );
}
