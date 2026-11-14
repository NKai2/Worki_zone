import { createRoot } from 'react-dom/client';
import HumanFigure, { MuscleMap } from '../src/anim/HumanFigure';
import { EX } from '../src/data/exercises';
const q = new URLSearchParams(location.search);
const ids = (q.get('ids') ?? 'squat').split(',');
createRoot(document.getElementById('root')!).render(
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 300px)', gap: 6, padding: 6 }}>
    {ids.map((id) => (
      <div key={id} className="stage stage3d" style={{ borderRadius: 12 }}>
        <div style={{ position: 'absolute', font: '12px sans-serif', padding: 6, zIndex: 2 }}>{id}</div>
        <HumanFigure anim={EX[id].anim} primary={EX[id].muscles} secondary={EX[id].secondary} playing={q.has('play')} still={Number(q.get('p') ?? 0)} />
      </div>
    ))}
    {q.has('map') && <div style={{ gridColumn: 'span 2', background: '#fff' }}><MuscleMap primary={EX[ids[0]].muscles} secondary={EX[ids[0]].secondary} /></div>}
  </div>,
);
