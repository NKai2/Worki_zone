import { useState } from 'react';
import type { Equip } from '../data/types';
import { Icon } from '../Icons';
import { useT, type Key } from '../i18n';
import { generatePlan } from '../lib/plan';
import { installProgram, PROGRAMS } from '../lib/programs';
import { getState, setState, useStore, type Experience, type Profile } from '../store';
import { Cell, Group, haptic, LangButton, Segmented, Stepper } from '../ui';

const EQUIP: Equip[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bench', 'pullup'];
const PRESETS: { key: Key; equip: Equip[] }[] = [
  { key: 'presetGym', equip: ['barbell', 'dumbbell', 'machine', 'cable', 'bench', 'pullup'] },
  { key: 'presetHome', equip: ['dumbbell', 'bench'] },
  { key: 'presetBw', equip: [] },
];
const SPLIT: Record<number, Key> = { 2: 'splitFb', 3: 'splitFb', 4: 'splitUl', 5: 'splitUlppl', 6: 'splitPpl' };

export default function Onboarding({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { t, tx } = useT();
  const existing = useStore((s) => s.profile);
  const lastBw = useStore((s) => s.bodyweight[s.bodyweight.length - 1]?.kg);
  const [p, setP] = useState<Profile>(existing ?? { experience: 'intermediate', days: 4, minutes: 60, equipment: PRESETS[0].equip });
  const [bw, setBw] = useState(lastBw ?? 70);
  const [step, setStep] = useState(existing ? 1 : 0);
  const last = 5;

  const toggle = (e: Equip) => {
    haptic(5);
    setP({ ...p, equipment: p.equipment.includes(e) ? p.equipment.filter((x) => x !== e) : [...p.equipment, e] });
  };

  const build = () => {
    haptic(20);
    const s = getState();
    setState({
      profile: p,
      plan: generatePlan(p),
      pointer: { week: 1, dayIndex: 0 },
      bodyweight: bw > 0 && bw !== lastBw ? [...s.bodyweight, { date: Date.now(), kg: bw }] : s.bodyweight,
    });
    onDone();
  };

  const next = () => { haptic(8); if (step < last) setStep(step + 1); else build(); };
  const back = () => (step > (existing ? 1 : 0) ? setStep(step - 1) : onCancel?.());

  const exp: [Experience, Key, Key][] = [
    ['beginner', 'expBeginner', 'expBeginnerSub'],
    ['intermediate', 'expIntermediate', 'expIntermediateSub'],
    ['advanced', 'expAdvanced', 'expAdvancedSub'],
  ];
  const preset = PRESETS.find((x) => x.equip.length === p.equipment.length && x.equip.every((e) => p.equipment.includes(e)));

  return (
    <div className="ob">
      <div className="navbar">
        {(step > (existing ? 1 : 0) || onCancel) && <button className="nav-text-btn" onClick={back}>‹ {t('back')}</button>}
        <div className="nav-actions"><LangButton /></div>
      </div>
      {step > 0 && <div className="dots">{Array.from({ length: last }, (_, i) => <i key={i} className={i + 1 === step ? 'on' : ''} />)}</div>}

      <div className="step" key={step}>
        {step === 0 && (
          <div className="center" style={{ paddingTop: '8vh' }}>
            <div className="ob-hero"><Icon.dumbbell /></div>
            <h1>{t('welcome')}</h1>
            <p className="lead">{t('welcomeSub')}</p>
            <Group style={{ textAlign: 'start' }}>
              <Cell icon={<Icon.plan on />} iconBg="var(--tint)" title={t('obFeat1')} />
              <Cell icon={<Icon.progress on />} iconBg="var(--green)" title={t('obFeat2')} />
              <Cell icon={<Icon.swim />} iconBg="var(--cyan)" title={t('obFeat3')} />
            </Group>
            <Group header={t('orReady')} style={{ textAlign: 'start' }}>
              <Cell icon={<Icon.dumbbell />} iconBg="var(--orange)" title={tx(PROGRAMS.mass16.name)} sub={tx(PROGRAMS.mass16.sub)} chevron
                onClick={() => installProgram('mass16').then(onDone)} />
            </Group>
          </div>
        )}

        {step === 1 && (
          <>
            <h1>{t('qExperience')}</h1>
            <p className="lead">{t('qExperienceSub')}</p>
            <Group>
              {exp.map(([id, a, b]) => (
                <Cell key={id} title={t(a)} sub={t(b)} onClick={() => { haptic(5); setP({ ...p, experience: id }); }}
                  trailing={p.experience === id ? <span className="check-mark"><Icon.check /></span> : <span style={{ width: 20 }} />} />
              ))}
            </Group>
          </>
        )}

        {step === 2 && (
          <>
            <h1>{t('qDays')}</h1>
            <p className="lead">{t(SPLIT[p.days])}</p>
            <div className="big-num">{p.days}</div>
            <div className="mt16"><Segmented lg value={p.days} onChange={(days) => setP({ ...p, days })} options={[2, 3, 4, 5, 6].map((d) => [d, String(d)] as [number, string])} /></div>
          </>
        )}

        {step === 3 && (
          <>
            <h1>{t('qMinutes')}</h1>
            <p className="lead">{t('qMinutesSub')}</p>
            <div className="big-num">{p.minutes}<span className="secondary" style={{ fontSize: 22 }}> {t('minutes')}</span></div>
            <div className="mt16"><Segmented lg value={p.minutes} onChange={(minutes) => setP({ ...p, minutes })} options={[45, 60, 75, 90].map((m) => [m, String(m)] as [number, string])} /></div>
          </>
        )}

        {step === 4 && (
          <>
            <h1>{t('qEquipment')}</h1>
            <Segmented value={preset?.key ?? 'custom'} onChange={(k) => { const x = PRESETS.find((y) => y.key === k); if (x) setP({ ...p, equipment: x.equip }); }}
              options={PRESETS.map((x) => [x.key, t(x.key)] as [string, string])} />
            <Group style={{ marginTop: 16 }} footer={t('equipFooter')}>
              {EQUIP.map((e) => (
                <Cell key={e} title={t(`eq_${e}` as Key)} onClick={() => toggle(e)}
                  trailing={p.equipment.includes(e) ? <span className="check-mark"><Icon.check /></span> : <span style={{ width: 20 }} />} />
              ))}
            </Group>
          </>
        )}

        {step === 5 && (
          <>
            <h1>{t('qBodyweightTitle')}</h1>
            <p className="lead">{t('qBodyweightSub')}</p>
            <div className="big-num num" dir="ltr">{bw ? bw.toFixed(1) : '—'}<span className="secondary" style={{ fontSize: 22 }}> {t('kg')}</span></div>
            <div className="mt16"><Stepper value={bw} step={0.5} decimal label={t('kg')} onChange={setBw} /></div>
          </>
        )}
      </div>

      <div className="actions">
        <button className="btn filled block" onClick={next}>{step === 0 ? t('getStarted') : step === last ? t('buildPlan') : t('continue')}</button>
      </div>
    </div>
  );
}
