import { useState } from 'react';
import { EX } from '../data/exercises';
import type { Muscle } from '../data/types';
import { MUSCLES, useT } from '../i18n';
import { e1rm, weeklySetsPerMuscle } from '../lib/plan';
import { sessionSets, sessionVolume } from '../lib/workout';
import { setState, useStore } from '../store';
import { Bars, LineChart } from '../ui';

export default function Progress() {
  const { t, tx, lang } = useT();
  const history = useStore((s) => s.history);
  const bodyweight = useStore((s) => s.bodyweight);
  const [bw, setBw] = useState('');

  const usedIds = [...new Set(history.flatMap((h) => h.exercises.map((e) => e.exId)))].filter((id) => EX[id]);
  const [exId, setExId] = useState<string>(usedIds[0] ?? '');

  const points = history
    .map((h) => {
      const e = h.exercises.find((x) => x.exId === exId);
      if (!e) return null;
      return { x: h.start, y: Math.max(...e.sets.map((s) => e1rm(s.w, s.r))) };
    })
    .filter((p): p is { x: number; y: number } => !!p && p.y > 0);

  const prs = usedIds
    .map((id) => {
      let best = { v: 0, w: 0, r: 0 };
      for (const h of history) for (const e of h.exercises) if (e.exId === id)
        for (const s of e.sets) { const v = e1rm(s.w, s.r); if (v > best.v) best = { v, w: s.w, r: s.r }; }
      return { id, ...best };
    })
    .filter((p) => p.v > 0)
    .sort((a, b) => b.v - a.v);

  const lastWeek = history.filter((h) => h.start > Date.now() - 7 * 864e5);
  const vol = weeklySetsPerMuscle(lastWeek.flatMap((h) => h.exercises.map((e) => ({ exId: e.exId, sets: e.sets.length }))));
  const order: Muscle[] = ['chest', 'back', 'shoulders', 'rearDelts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];

  const logBw = () => {
    const kg = parseFloat(bw.replace(',', '.'));
    if (!(kg > 0)) return;
    setState((s) => ({ bodyweight: [...s.bodyweight, { date: Date.now(), kg }] }));
    setBw('');
  };

  const total = history.reduce((v, h) => v + sessionVolume(h), 0);

  return (
    <div>
      <h1>{t('progressTitle')}</h1>
      <div className="stats" style={{ marginTop: 12 }}>
        <div className="stat"><b>{history.length}</b><span>{t('totalWorkouts')}</span></div>
        <div className="stat"><b>{history.reduce((n, h) => n + sessionSets(h), 0)}</b><span>{t('totalSets')}</span></div>
        <div className="stat"><b>{(total / 1000).toFixed(1)}</b><span>{t('totalVolume')}</span></div>
      </div>

      <h2>{t('e1rm')}</h2>
      <div className="card">
        {usedIds.length ? (
          <select className="input" value={exId} onChange={(e) => setExId(e.target.value)}>
            {usedIds.map((id) => <option key={id} value={id}>{tx(EX[id].name)}</option>)}
          </select>
        ) : null}
        <LineChart points={points} unit={t('kg')} />
      </div>

      <h2>{t('last4w')}</h2>
      <div className="card">
        {Object.keys(vol).length ? (
          <Bars data={order.filter((m) => vol[m]).map((m) => [tx(MUSCLES[m]), vol[m]!])} max={24} target={[10, 20]} />
        ) : <div className="muted small">{t('noData')}</div>}
      </div>

      <h2>{t('bodyweightTitle')}</h2>
      <div className="card">
        <div className="row">
          <input className="input grow" inputMode="decimal" placeholder={t('kg')} value={bw} onChange={(e) => setBw(e.target.value)} />
          <button className="btn primary" onClick={logBw}>{t('logWeight')}</button>
        </div>
        <LineChart points={bodyweight.map((b) => ({ x: b.date, y: b.kg }))} unit={t('kg')} />
        {bodyweight.length > 0 && (
          <div className="muted small">
            {bodyweight[bodyweight.length - 1].kg} {t('kg')} · {new Date(bodyweight[bodyweight.length - 1].date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB')}
          </div>
        )}
      </div>

      <h2>{t('personalRecords')}</h2>
      {prs.length === 0 && <div className="muted small">{t('noData')}</div>}
      {prs.map((p) => (
        <div key={p.id} className="list-item">
          <div className="grow"><b>{tx(EX[p.id].name)}</b></div>
          <div className="small" dir="ltr">{p.w ? `${p.w}×${p.r}` : `${p.r}`} · <span className="muted">e1RM {p.v.toFixed(1)}</span></div>
        </div>
      ))}
    </div>
  );
}
