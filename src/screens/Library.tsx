import { useState } from 'react';
import { EXERCISES } from '../data/exercises';
import type { Muscle } from '../data/types';
import { Icon } from '../Icons';
import { MUSCLES, useT } from '../i18n';
import { ExerciseDetail, NavBar, Sheet, Thumb } from '../ui';

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
      <NavBar title={t('libraryTitle')} />
      <label className="search">
        <Icon.search />
        <input type="search" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="chips mt12">
        <button className={`chip ${!muscle ? 'on' : ''}`} onClick={() => setMuscle(null)}>{t('all')}</button>
        {GROUPS.map((m) => (
          <button key={m} className={`chip ${muscle === m ? 'on' : ''}`} onClick={() => setMuscle(muscle === m ? null : m)}>{tx(MUSCLES[m])}</button>
        ))}
      </div>
      {list.length === 0 && <div className="empty">{t('noResults')}</div>}
      <div className="lib-grid">
        {list.map((e) => (
          <button key={e.id} className="lib-card" onClick={() => setOpen(e.id)}>
            <Thumb exId={e.id} />
            <div className="b">
              <div className="nm">{tx(e.name)}</div>
              <div className="mu">{e.muscles.map((m) => tx(MUSCLES[m])).join(' · ')}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="group-footer center">{list.length} {t('exercises')}</div>
      {open && <Sheet onClose={() => setOpen(null)}><ExerciseDetail exId={open} /></Sheet>}
    </div>
  );
}
