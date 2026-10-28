import { useState } from 'react';
import Figure from '../anim/Figure';
import { EXERCISES } from '../data/exercises';
import type { Muscle } from '../data/types';
import { MUSCLES, useT } from '../i18n';
import { ExerciseDetail, Sheet } from '../ui';

const GROUPS: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];

export default function Library() {
  const { t, tx } = useT();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const query = q.trim().toLowerCase();
  const list = EXERCISES.filter(
    (e) =>
      (!muscle || e.muscles.includes(muscle) || (muscle === 'shoulders' && e.muscles.includes('rearDelts'))) &&
      (!query || e.name.he.includes(query) || e.name.en.toLowerCase().includes(query)),
  );

  return (
    <div>
      <h1>{t('libraryTitle')}</h1>
      <input className="input" style={{ margin: '10px 0' }} placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="filters">
        <button className={!muscle ? 'on' : ''} onClick={() => setMuscle(null)}>{t('all')}</button>
        {GROUPS.map((m) => (
          <button key={m} className={muscle === m ? 'on' : ''} onClick={() => setMuscle(m)}>{tx(MUSCLES[m])}</button>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        {list.map((e) => (
          <button key={e.id} className="list-item" onClick={() => setOpen(e.id)}>
            <div className="thumb"><Figure anim={e.anim} highlight={e.hl} playing={false} still={0.7} /></div>
            <div className="grow">
              <b>{tx(e.name)}</b>
              <div className="muted small">
                {e.muscles.map((m) => tx(MUSCLES[m])).join(' · ')}
                {' · '}
                {e.equip.length ? e.equip.map((x) => t(`eq_${x}`)).join(', ') : t('noEquipment')}
              </div>
            </div>
          </button>
        ))}
      </div>
      {open && <Sheet onClose={() => setOpen(null)}><ExerciseDetail exId={open} /></Sheet>}
    </div>
  );
}
