// Renders one exercise still for tools/render_thumbs.cjs
import { createRoot } from 'react-dom/client';
import HumanFigure from '../src/anim/HumanFigure';
import { EX } from '../src/data/exercises';
const id = new URLSearchParams(location.search).get('id') ?? 'squat';
const ex = EX[id];
createRoot(document.getElementById('root')!).render(
  <div id="shot" className="stage stage3d" style={{ width: 320, height: 320, borderRadius: 0 }}>
    <HumanFigure anim={ex.anim} primary={ex.muscles} secondary={ex.secondary} playing={false} still={0.6} />
  </div>,
);
