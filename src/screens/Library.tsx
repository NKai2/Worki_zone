import { useState } from 'react';
import Figure from '../anim/Figure';
import { EXERCISES } from '../data/exercises';
import type { Muscle } from '../data/types';
import { Icon } from '../Icons';
import { MUSCLES, useT, type Key } from '../i18n';
import { Cell, ExerciseDetail, Group, LangButton, NavBar, Sheet } from '../ui';

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
      <NavBar title={t('libraryTitle')} actions={<LangButton />} />
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
      <Group style={{ marginTop: 12 }} footer={`${list.length} ${t('exercises')}`}>
        {list.length === 0 && <div className="empty">{t('noResults')}</div>}
        {list.map((e) => (
          <Cell key={e.id} onClick={() => setOpen(e.id)} chevron inset={80}
            leading={<div className="thumb"><Figure anim={e.anim} highlight={e.hl} playing={false} still={0.7} /></div>}
            title={tx(e.name)}
            sub={`${e.muscles.map((m) => tx(MUSCLES[m])).join(' · ')} — ${e.equip.length ? e.equip.map((x) => t(`eq_${x}` as Key)).join(', ') : t('noEquipment')}`} />
        ))}
      </Group>
      {open && <Sheet onClose={() => setOpen(null)}><ExerciseDetail exId={open} /></Sheet>}
    </div>
  );
}
