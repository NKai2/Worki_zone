import { useState } from 'react';
import { EX, EXERCISES } from '../data/exercises';
import type { Muscle } from '../data/types';
import { Icon } from '../Icons';
import { MUSCLES, useT, type Key } from '../i18n';
import { alternatives, available, makeSlot, noteFor, patternOf, repsFor, setsFor, weekInfo, weeklySetsPerMuscle } from '../lib/plan';
import { installProgram, PROGRAMS, programLink, type ProgramId } from '../lib/programs';
import { getState, setState, useStore, type Slot } from '../store';
import { Bars, Cell, Demo, ExerciseDetail, Group, LangButton, NavBar, Segmented, Sheet, Stepper, Thumb } from '../ui';

type Picker = { day: number; slot: number }; // slot -1 = add new

const ORDER: Muscle[] = ['chest', 'back', 'shoulders', 'rearDelts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];

export default function PlanScreen({ onRebuild }: { onRebuild: () => void }) {
  const { t, tx } = useT();
  const plan = useStore((s) => s.plan)!;
  const profile = useStore((s) => s.profile)!;
  const pointer = useStore((s) => s.pointer);
  const [day, setDay] = useState(pointer.dayIndex % plan.days.length);
  const [edit, setEdit] = useState<number | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const week = Math.min(pointer.week, plan.weeks);
  const info = weekInfo(plan, week);
  const d = plan.days[day];

  const editSlot = (dayIdx: number, slot: number, fn: (s: Slot) => Slot | null) => {
    const p = getState().plan!;
    const days = p.days.map((x, i) => (i !== dayIdx ? x : { ...x, slots: x.slots.map((s, j) => (j === slot ? fn(s) : s)).filter(Boolean) as Slot[] }));
    setState({ plan: { ...p, days } });
  };

  const choose = (exId: string) => {
    if (!picker) return;
    const ex = EX[exId];
    if (picker.slot === -1) {
      const p = getState().plan!;
      const days = p.days.map((x, i) => (i === picker.day ? { ...x, slots: [...x.slots, makeSlot(ex, patternOf(ex.id), profile.experience)] } : x));
      setState({ plan: { ...p, days } });
    } else {
      editSlot(picker.day, picker.slot, (s) => ({ ...s, exId, pattern: patternOf(exId), reps: ex.reps, rest: ex.rest }));
    }
    setPicker(null);
    setEdit(null);
  };

  const volume = weeklySetsPerMuscle(plan.days.flatMap((x) => x.slots.map((s) => ({ exId: s.exId, sets: setsFor(s, plan, week) }))));
  const options = picker
    ? picker.slot === -1
      ? EXERCISES.filter((e) => available(e, profile.equipment))
      : alternatives(plan.days[picker.day].slots[picker.slot].exId, plan.days[picker.day].slots[picker.slot].pattern, profile.equipment)
    : [];
  const slot = edit !== null ? d.slots[edit] : null;

  return (
    <div>
      <NavBar
        title={plan.program ? tx(PROGRAMS[plan.program as ProgramId].name) : t('planTitle')}
        sub={`${plan.program ? `${t('block')} ${info.block + 1} · ` : ''}${t('week')} ${week} ${t('of')} ${plan.weeks} · ${info.deload ? t('deload') : `${t('targetRir')} ${info.rir}`}`}
        actions={<LangButton />}
      />

      <Segmented lg options={plan.days.map((_, i) => [i, `${t('dayShort')} ${i + 1}`] as [number, string])} value={day} onChange={setDay} />

      <Group
        header={<span>{t(`day_${d.key}` as Key)}{pointer.dayIndex === day ? ` · ${t('nextWorkout')}` : ''}</span>}
        footer={t('rirExplain')}
      >
        {d.slots.map((s, si) => {
          const ex = EX[s.exId];
          const r = repsFor(s, plan, week);
          const note = noteFor(s, plan, week);
          const paired = s.pair || d.slots[si - 1]?.pair;
          return (
            <Cell key={`${s.exId}-${si}`} onClick={() => setEdit(si)} chevron inset={80}
              leading={<Thumb exId={s.exId} />}
              title={<>{tx(ex.name)}{paired && <span className="tag tint" style={{ marginInlineStart: 6 }}>{t('superset')}</span>}</>}
              sub={<><span className="num">{setsFor(s, plan, week)} × {r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`}{s.exId === 'plank' ? ` ${t('sec')}` : ''} · {t('rest')} {s.rest}{t('sec')}</span>{note && <> · {tx(note)}</>}</>} />
          );
        })}
        <Cell title={`+ ${t('addExercise')}`} onClick={() => setPicker({ day, slot: -1 })} />
      </Group>

      <Group header={t('weeklyVolume')} footer={t('volumeHint')}>
        <div className="cell" style={{ display: 'block', padding: 16 }}>
          <Bars data={ORDER.filter((m) => volume[m]).map((m) => [tx(MUSCLES[m]), volume[m]!])} max={24} target={[10, 20]} />
        </div>
      </Group>

      <Group header={t('programsTitle')} footer={t('programsFooter')}>
        {(Object.keys(PROGRAMS) as ProgramId[]).map((id) => (
          <Cell key={id} icon={<Icon.plan on />} iconBg="var(--green)" title={tx(PROGRAMS[id].name)} sub={tx(PROGRAMS[id].sub)}
            detail={plan.program === id ? t('active') : undefined}
            onClick={plan.program === id ? undefined : () => { if (confirm(t('programConfirm'))) installProgram(id); }} chevron={plan.program !== id} />
        ))}
        {plan.program && (
          <Cell title={t('copyLink')} onClick={() => { navigator.clipboard?.writeText(programLink(plan.program as ProgramId)); alert(`${t('linkCopied')}\n${programLink(plan.program as ProgramId)}`); }} />
        )}
      </Group>

      <Group style={{ marginTop: 24 }}>
        <Cell title={plan.program ? t('restartProgram') : t('rebuild')} onClick={() => {
          if (!confirm(t('rebuildConfirm'))) return;
          if (plan.program) installProgram(plan.program as ProgramId); else onRebuild();
        }} />
        {plan.program && <Cell title={t('rebuild')} onClick={() => { if (confirm(t('rebuildConfirm'))) onRebuild(); }} />}
      </Group>

      {slot && edit !== null && !picker && (
        <Sheet title={tx(EX[slot.exId].name)} onClose={() => setEdit(null)}>
          <div className="stage stage3d">
            <Demo exId={slot.exId} />
          </div>
          <Group header={t('baseSets')} footer={t('baseSetsHint')}>
            <div className="cell">
              <div className="grow"><Stepper value={slot.blocks ? slot.blocks[info.block][0] : slot.sets} step={1} label={t('sets')} onChange={(v) => editSlot(day, edit, (x) => {
                const n = Math.min(8, Math.max(1, Math.round(v)));
                if (!x.blocks) return { ...x, sets: n };
                // Program slots: shift every block by the same amount
                const delta = n - x.blocks[info.block][0];
                return { ...x, blocks: x.blocks.map(([st, a, b]) => [Math.min(8, Math.max(1, st + delta)), a, b] as [number, number, number]) };
              })} /></div>
            </div>
          </Group>
          <Group style={{ marginTop: 20 }}>
            <Cell title={t('howTo')} icon={<Icon.info />} onClick={() => setDetail(slot.exId)} chevron />
            <Cell title={t('swap')} icon={<Icon.swap />} iconBg="#5e5ce6" onClick={() => setPicker({ day, slot: edit })} chevron />
          </Group>
          <Group style={{ marginTop: 20 }}>
            <Cell title={t('remove')} danger onClick={() => { editSlot(day, edit, () => null); setEdit(null); }} />
          </Group>
        </Sheet>
      )}

      {picker && (
        <Sheet title={picker.slot === -1 ? t('addExercise') : t('swapTitle')} onClose={() => setPicker(null)}>
          <Group>
            {options.map((e) => (
              <Cell key={e.id} onClick={() => choose(e.id)} inset={80}
                leading={<Thumb exId={e.id} />}
                title={tx(e.name)} sub={e.muscles.map((m) => tx(MUSCLES[m])).join(' · ')} />
            ))}
          </Group>
        </Sheet>
      )}
      {detail && <Sheet onClose={() => setDetail(null)}><ExerciseDetail exId={detail} /></Sheet>}
    </div>
  );
}
