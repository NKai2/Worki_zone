import { useState } from 'react';
import type { Equip } from '../data/types';
import { useT, type Key } from '../i18n';
import { generatePlan } from '../lib/plan';
import { getState, setState, useStore, type Experience, type Profile } from '../store';

const EQUIP: Equip[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bench', 'pullup'];
const PRESETS: { key: Key; equip: Equip[] }[] = [
  { key: 'presetGym', equip: ['barbell', 'dumbbell', 'machine', 'cable', 'bench', 'pullup'] },
  { key: 'presetHome', equip: ['dumbbell', 'bench'] },
  { key: 'presetBw', equip: [] },
];

export default function Onboarding({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { t } = useT();
  const existing = useStore((s) => s.profile);
  const [p, setP] = useState<Profile>(existing ?? { experience: 'intermediate', days: 4, minutes: 60, equipment: PRESETS[0].equip });
  const [bw, setBw] = useState('');

  const toggle = (e: Equip) =>
    setP({ ...p, equipment: p.equipment.includes(e) ? p.equipment.filter((x) => x !== e) : [...p.equipment, e] });

  const build = () => {
    const plan = generatePlan(p);
    const kg = parseFloat(bw);
    const s = getState();
    setState({
      profile: p,
      plan,
      pointer: { week: 1, dayIndex: 0 },
      bodyweight: kg > 0 ? [...s.bodyweight, { date: Date.now(), kg }] : s.bodyweight,
    });
    onDone();
  };

  const exp: [Experience, Key, Key][] = [
    ['beginner', 'expBeginner', 'expBeginnerSub'],
    ['intermediate', 'expIntermediate', 'expIntermediateSub'],
    ['advanced', 'expAdvanced', 'expAdvancedSub'],
  ];

  return (
    <div>
      <div className="card hero">
        <h1>{t('welcome')}</h1>
        <p className="muted" style={{ margin: 0 }}>{t('welcomeSub')}</p>
      </div>

      <h2>{t('qExperience')}</h2>
      <div className="choices">
        {exp.map(([id, a, b]) => (
          <button key={id} className={`choice ${p.experience === id ? 'on' : ''}`} onClick={() => setP({ ...p, experience: id })}>
            <b>{t(a)}</b><span>{t(b)}</span>
          </button>
        ))}
      </div>

      <h2>{t('qDays')}</h2>
      <div className="choices" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {[2, 3, 4, 5, 6].map((d) => (
          <button key={d} className={`choice ${p.days === d ? 'on' : ''}`} style={{ textAlign: 'center' }} onClick={() => setP({ ...p, days: d })}>
            <b>{d}</b>
          </button>
        ))}
      </div>

      <h2>{t('qMinutes')}</h2>
      <div className="choices" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[45, 60, 75, 90].map((m) => (
          <button key={m} className={`choice ${p.minutes === m ? 'on' : ''}`} style={{ textAlign: 'center' }} onClick={() => setP({ ...p, minutes: m })}>
            <b>{m}</b><span>{t('minutes')}</span>
          </button>
        ))}
      </div>

      <h2>{t('qEquipment')}</h2>
      <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
        {PRESETS.map((x) => (
          <button key={x.key} className="btn sm ghost" onClick={() => setP({ ...p, equipment: x.equip })}>{t(x.key)}</button>
        ))}
      </div>
      <div className="choices">
        {EQUIP.map((e) => (
          <button key={e} className={`choice ${p.equipment.includes(e) ? 'on' : ''}`} onClick={() => toggle(e)}>
            <b>{t(`eq_${e}` as Key)}</b>
          </button>
        ))}
      </div>

      {!existing && (
        <label className="field">
          <span>{t('qBodyweight')}</span>
          <input className="input" inputMode="decimal" value={bw} onChange={(e) => setBw(e.target.value)} placeholder="75" />
        </label>
      )}

      <div className="row" style={{ marginTop: 22 }}>
        {onCancel && <button className="btn ghost" onClick={onCancel}>{t('back')}</button>}
        <button className="btn primary grow" onClick={build}>{t('buildPlan')}</button>
      </div>
    </div>
  );
}
