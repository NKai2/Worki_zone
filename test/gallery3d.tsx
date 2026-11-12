import { createRoot } from 'react-dom/client';
import Figure3D from '../src/anim/Figure3D';
import { EX } from '../src/data/exercises';
const q = new URLSearchParams(location.search);
const ids = (q.get('ids') ?? 'squat').split(',');
const still = Number(q.get('p') ?? '0.5');
createRoot(document.getElementById('root')!).render(
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 300px)', gap: 6, padding: 6, background: '#000' }}>
    {ids.map((id) => (
      <div key={id} className="stage stage3d" style={{ borderRadius: 12 }}>
        <div style={{ position: 'absolute', color: '#fff', font: '12px sans-serif', padding: 6, zIndex: 2 }}>{id}</div>
        <Figure3D anim={EX[id].anim} highlight={EX[id].hl} playing={false} still={still} />
      </div>
    ))}
  </div>,
);
