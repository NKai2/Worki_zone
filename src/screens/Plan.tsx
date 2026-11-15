import { useState } from 'react';
import { EX, EXERCISES } from '../data/exercises';
import type { Muscle } from '../data/types';
import { Icon } from '../Icons';
import { MUSCLES, useT, type Key } from '../i18n';
import { alternatives, available, makeSlot, noteFor, patternOf, repsFor, setsFor, weekInfo, weeklySetsPerMuscle } from '../lib/plan';
import { installProgram, PROGRAMS, programLink, type ProgramId } from '../lib/programs';
import { getState, setState, useStore, type Slot } from '../store';
import { Bars, Cell, Demo, ExerciseDetail, Group, NavBar, Rings, Segmented, Sheet, Stepper, Thumb } from '../ui';
import { BLOCKS, GUIDE } from '../data/guide';

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
  const [openGuide, setOpenGuide] = useState<string | null>('progression');
  const history = useStore((s) => s.history);
  const bodyweight = useStore((s) => s.bodyweight[s.bodyweight.length - 1]?.kg);
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

  // Group the session: consecutive single exercises share a card, supersets get their own linked card
  const groups: { pair: boolean; items: number[] }[] = [];
  d.slots.forEach((sl, i) => {
    if (d.slots[i - 1]?.pair) return; // already taken as the second half of a pair
    if (sl.pair && d.slots[i + 1]) groups.push({ pair: true, items: [i, i + 1] });
    else if (groups.length && !groups[groups.length - 1].pair) groups[groups.length - 1].items.push(i);
    else groups.push({ pair: false, items: [i] });
  });
  const kg = bodyweight;
  const doneInProgram = history.filter((h) => h.start >= plan.createdAt && h.exercises.length).length;
  const totalSessions = plan.weeks * plan.days.length;
  const prog = plan.program ? PROGRAMS[plan.program as ProgramId] : null;
  const iconFor = { progress: Icon.progress, flame: Icon.flame, leaf: Icon.leaf, shield: Icon.check, warn: Icon.info, ruler: Icon.edit } as const;

  return (
    <div>
      <NavBar title={t('planTitle')} />

      <section className="prog-hero">
        <div className="ring"><Rings size={64} values={[doneInProgram / totalSessions]} colors={['#30d158']} /></div>
        <span className="tag green">{prog ? t('active') : t('customPlan')}</span>
        <h1 style={{ maxWidth: '75%' }}>{prog ? tx(prog.name) : t('planTitle')}</h1>
        <div className="sub">{prog ? tx(prog.sub) : `${plan.days.length} ${t('daysPerWeek')}`}</div>
        <div className="stats">
          <div><b className="num">{week}<small style={{ fontSize: 13, opacity: 0.6 }}>/{plan.weeks}</small></b><span>{t('week')}</span></div>
          <div><b>{info.deload ? t('deloadShort') : plan.program ? info.block + 1 : `RIR ${info.rir}`}</b><span>{info.deload ? t('thisWeek') : plan.program ? t('block') : t('targetRir')}</span></div>
          <div><b className="num">{doneInProgram}<small style={{ fontSize: 13, opacity: 0.6 }}>/{totalSessions}</small></b><span>{t('workouts')}</span></div>
        </div>
      </section>

      {plan.program && (
        <>
          <div className="section-h"><h2>{t('theBlocks')}</h2></div>
          <div className="hscroll">
            {BLOCKS.map((b, i) => (
              <div key={i} className={`block-card ${i === info.block ? 'now' : ''}`} style={{ ['--c' as string]: b.color }}>
                <div className="n">{t('block')} {i + 1}{i === info.block ? ` · ${t('now')}` : ''}</div>
                <div className="name">{tx(b.name)}</div>
                <div className="w">{tx(b.weeks)}</div>
                <div className="sc"><span dir="ltr">{b.scheme}</span><span>{b.rir}</span></div>
                <p>{tx(b.what)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-h"><h2>{t('theSessions')}</h2></div>
      <Segmented lg options={plan.days.map((x, i) => [i, plan.program ? `${t('session')} ${x.key.slice(-1)}` : `${t('dayShort')} ${i + 1}`] as [number, string])} value={day} onChange={setDay} />
      <div className="subhead secondary" style={{ margin: '10px 4px 0' }}>
        {t(`day_${d.key}` as Key)}{pointer.dayIndex === day ? ` · ${t('nextWorkout')}` : ''}
      </div>
      <div className="sess">
        {groups.map((g, gi) => (
          <div key={gi} className={`ex-group ${g.pair ? 'pair' : ''}`}>
            {g.pair && <div className="pair-h"><Icon.swap />{t('superset')} · {t('supersetHint')}</div>}
            {g.items.map((si) => {
              const sl = d.slots[si];
              const r = repsFor(sl, plan, week);
              const note = noteFor(sl, plan, week);
              return (
                <button key={si} className="ex-row" onClick={() => setEdit(si)}>
                  <span className="idx">{si + 1}</span>
                  <Thumb exId={sl.exId} />
                  <div className="grow">
                    <div className="nm">{tx(EX[sl.exId].name)}</div>
                    <div className="rx"><b dir="ltr">{setsFor(sl, plan, week)} × {r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`}</b>{sl.exId === 'plank' ? ` ${t('sec')}` : ''} · {t('rest')} {sl.rest}{t('sec')}</div>
                    {note && <div className="nt">{tx(note)}</div>}
                  </div>
                  <span className="chev" style={{ color: 'var(--label-3)' }}><Icon.chevron /></span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <button className="btn tinted block mt12" onClick={() => setPicker({ day, slot: -1 })}><Icon.plus /> {t('addExercise')}</button>

      {plan.program && (
        <>
          <div className="section-h"><h2>{t('theGuide')}</h2></div>
          {GUIDE.map((g) => {
            const Ico = iconFor[g.icon];
            const isOpen = openGuide === g.id;
            return (
              <div key={g.id} className={`guide ${isOpen ? 'open' : ''}`} style={{ ['--c' as string]: g.color }}>
                <button onClick={() => setOpenGuide(isOpen ? null : g.id)} aria-expanded={isOpen}>
                  <span className="ic" style={{ background: g.color }}><Ico /></span>
                  <div className="grow"><div className="tt">{tx(g.title)}</div><div className="ld">{tx(g.lead)}</div></div>
                  <span className="chev"><Icon.chevron /></span>
                </button>
                {isOpen && g.id === 'nutrition' && (
                  kg ? (
                    <div className="nut">
                      <div><b className="num">{(Math.round((kg * 33 + 300) / 50) * 50).toLocaleString()}</b><span>{t('calories')}</span></div>
                      <div><b className="num" dir="ltr">{Math.round(kg * 1.6)}-{Math.round(kg * 2.2)}</b><span>{t('protein')} ({t('grams')})</span></div>
                      <div><b className="num" dir="ltr">{Math.round(kg * 4)}-{Math.round(kg * 5)}</b><span>{t('carbs')} ({t('grams')})</span></div>
                    </div>
                  ) : <div className="ld" style={{ padding: '0 14px 10px' }}>{t('enterBw')}</div>
                )}
                {isOpen && <ul>{g.points.map((pt, i) => <li key={i}>{tx(pt)}</li>)}</ul>}
              </div>
            );
          })}
          <div className={`guide ${openGuide === 'volume' ? 'open' : ''}`} style={{ ['--c' as string]: '#5e5ce6', marginTop: 10 }}>
            <button onClick={() => setOpenGuide(openGuide === 'volume' ? null : 'volume')}>
              <span className="ic" style={{ background: '#5e5ce6' }}><Icon.progress /></span>
              <div className="grow"><div className="tt">{t('weeklyVolume')}</div><div className="ld">{t('volumeHint')}</div></div>
              <span className="chev"><Icon.chevron /></span>
            </button>
            {openGuide === 'volume' && <div style={{ padding: '4px 14px 16px' }}><Bars data={ORDER.filter((m) => volume[m]).map((m) => [tx(MUSCLES[m]), volume[m]!])} max={24} target={[10, 20]} /></div>}
          </div>
        </>
      )}

      <div className="section-h"><h2>{t('programsTitle')}</h2></div>
      <Group footer={t('programsFooter')}>
        {(Object.keys(PROGRAMS) as ProgramId[]).map((id) => (
          <Cell key={id} icon={<Icon.plan on />} iconBg="var(--green)" title={tx(PROGRAMS[id].name)} sub={tx(PROGRAMS[id].sub)}
            detail={plan.program === id ? t('active') : undefined}
            onClick={plan.program === id ? undefined : () => { if (confirm(t('programConfirm'))) installProgram(id); }} chevron={plan.program !== id} />
        ))}
        {plan.program && (
          <Cell title={t('copyLink')} onClick={() => { navigator.clipboard?.writeText(programLink(plan.program as ProgramId)); alert(`${t('linkCopied')}\n${programLink(plan.program as ProgramId)}`); }} />
        )}
      </Group>
      <Group style={{ marginTop: 16 }}>
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
