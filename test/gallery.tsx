import { createRoot } from 'react-dom/client';
import Figure from '../src/anim/Figure';
import { EXERCISES } from '../src/data/exercises';
const ids = new URLSearchParams(location.search).get('ids')?.split(',');
const pos = Number(new URLSearchParams(location.search).get('p') ?? '0');
createRoot(document.getElementById('root')!).render(
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(ids ? 4 : 8, ids ? 300px : 200px)', gap: 6, background: '#0f1115', padding: 6 }}>
    {EXERCISES.filter((e) => !ids || ids.includes(e.id)).map((e) => (
      <div key={e.id} style={{ color: '#fff', font: '11px sans-serif', background: '#1a1d24' }}>
        {e.id}
        <Figure anim={e.anim} highlight={e.hl} playing={false} still={pos} />
      </div>
    ))}
  </div>,
);
