import { useState } from 'react';
import { EX } from '../data/exercises';
import type { Muscle } from '../data/types';
import { Icon } from '../Icons';
import { MUSCLES, useT } from '../i18n';
import { e1rm, weeklySetsPerMuscle } from '../lib/plan';
import { fmtPace, logBodyweight, pace, sessionSets, sessionVolume } from '../lib/workout';
import { useStore } from '../store';
import { Bars, Cell, Group, haptic, LineChart, NavBar, Segmented, Stepper } from '../ui';

const ORDER: Muscle[] = ['chest', 'back', 'shoulders', 'rearDelts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];
type View = 'strength' | 'swim' | 'body';

export default function Progress() {
  const { t, tx, lang } = useT();
  const history = useStore((s) => s.history);
  const bodyweight = useStore((s) => s.bodyweight);
  const [view, setView] = useState<View>('strength');
  const [bw, setBw] = useState(bodyweight[bodyweight.length - 1]?.kg ?? 0);

  const lifts = history.filter((h) => h.exercises.length > 0);
  const usedIds = [...new Set(lifts.flatMap((h) => h.exercises.map((e) => e.exId)))].filter((id) => EX[id]);
  const [exId, setExId] = useState<string>(usedIds[0] ?? '');

  const points = lifts
    .map((h) => {
      const e = h.exercises.find((x) => x.exId === exId);
      return e ? { x: h.start, y: Math.max(...e.sets.map((s) => e1rm(s.w, s.r))) } : null;
    })
    .filter((p): p is { x: number; y: number } => !!p && p.y > 0);

  const prs = usedIds
    .map((id) => {
      let best = { v: 0, w: 0, r: 0 };
      for (const h of lifts) for (const e of h.exercises) if (e.exId === id)
        for (const s of e.sets) { const v = e1rm(s.w, s.r); if (v > best.v) best = { v, w: s.w, r: s.r }; }
      return { id, ...best };
    })
    .filter((p) => p.v > 0)
    .sort((a, b) => b.v - a.v);

  const lastWeek = lifts.filter((h) => h.start > Date.now() - 7 * 864e5);
  const vol = weeklySetsPerMuscle(lastWeek.flatMap((h) => h.exercises.map((e) => ({ exId: e.exId, sets: e.sets.length }))));
  const total = lifts.reduce((v, h) => v + sessionVolume(h), 0);

  const swims = history.flatMap((h) => (h.swims ?? []).map((e) => ({ date: h.start, e })));
  const swimAll = swims.reduce((d, x) => d + x.e.distance, 0);
  const swimWeek = swims.filter((x) => x.date > Date.now() - 7 * 864e5).reduce((d, x) => d + x.e.distance, 0);
  const bestPace = swims.length ? Math.min(...swims.map((x) => pace(x.e))) : 0;

  const date = (ms: number) => new Date(ms).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' });

  return (
    <div>
      <NavBar title={t('progressTitle')} />
      <Segmented lg value={view} onChange={setView}
        options={[['strength', t('strength')], ['swim', t('swim')], ['body', t('bodyweightTitle')]]} />

      {view === 'strength' && (
        <>
          <div className="tiles mt16">
            <div className="tile"><div className="k">{t('totalWorkouts')}</div><div className="v">{lifts.length}</div></div>
            <div className="tile"><div className="k">{t('totalSets')}</div><div className="v">{lifts.reduce((n, h) => n + sessionSets(h), 0)}</div></div>
            <div className="tile"><div className="k">{t('totalVolume')}</div><div className="v">{(total / 1000).toFixed(1)}<small> t</small></div></div>
          </div>

          <Group header={t('e1rm')}>
            {usedIds.length > 0 && (
              <div className="cell">
                <select className="grow" style={{ border: 0, background: 'transparent', color: 'var(--tint)', fontSize: 17 }} value={exId} onChange={(e) => setExId(e.target.value)}>
                  {usedIds.map((id) => <option key={id} value={id}>{tx(EX[id].name)}</option>)}
                </select>
                <span className="chev" style={{ transform: 'rotate(90deg)' }}><Icon.chevron /></span>
              </div>
            )}
            <div className="cell" style={{ display: 'block', padding: '12px 12px 8px' }}>
              <LineChart points={points} unit={t('kg')} />
            </div>
          </Group>

          <Group header={t('last4w')} footer={t('volumeHint')}>
            <div className="cell" style={{ display: 'block', padding: 16 }}>
              {Object.keys(vol).length
                ? <Bars data={ORDER.filter((m) => vol[m]).map((m) => [tx(MUSCLES[m]), vol[m]!])} max={24} target={[10, 20]} />
                : <div className="empty" style={{ padding: 8 }}>{t('noData')}</div>}
            </div>
          </Group>

          <Group header={t('personalRecords')}>
            {prs.length === 0 && <div className="empty">{t('noData')}</div>}
            {prs.map((p) => (
              <Cell key={p.id} icon={<Icon.trophy />} iconBg="#ff9f0a" title={tx(EX[p.id].name)}
                detail={<span className="num" dir="ltr">{p.w ? `${p.w}×${p.r}` : p.r} · {p.v.toFixed(0)}</span>} />
            ))}
          </Group>
        </>
      )}

      {view === 'swim' && (
        <>
          <div className="tiles mt16">
            <div className="tile"><div className="k">{t('swimThisWeek')}</div><div className="v" style={{ color: 'var(--cyan)' }}>{(swimWeek / 1000).toFixed(1)}<small> {t('km')}</small></div></div>
            <div className="tile"><div className="k">{t('swimTotal')}</div><div className="v">{(swimAll / 1000).toFixed(1)}<small> {t('km')}</small></div></div>
            <div className="tile"><div className="k">{t('bestPace')}</div><div className="v" dir="ltr">{bestPace ? fmtPace(bestPace) : '—'}</div></div>
          </div>
          <Group header={t('swimPace')}>
            <div className="cell" style={{ display: 'block', padding: '12px 12px 8px' }}>
              <LineChart points={swims.map((x) => ({ x: x.date, y: pace(x.e) }))} fmtY={fmtPace} color="var(--cyan)" />
            </div>
          </Group>
          <Group header={t('recent')}>
            {swims.length === 0 && <div className="empty">{t('noData')}</div>}
            {swims.slice(-8).reverse().map((x, i) => (
              <Cell key={i} icon={<Icon.swim />} iconBg="var(--cyan)" title={<span className="num" dir="ltr">{x.e.distance} m · {Math.round(x.e.duration / 60)} min</span>}
                sub={date(x.date)} detail={<span className="num" dir="ltr">{fmtPace(pace(x.e))}/100</span>} />
            ))}
          </Group>
        </>
      )}

      {view === 'body' && (
        <>
          <Group header={t('logWeightTitle')} style={{ marginTop: 16 }}>
            <div className="cell">
              <div className="grow"><Stepper value={bw} step={0.1} decimal label={t('kg')} onChange={setBw} /></div>
              <button className="btn small filled" disabled={!bw} onClick={() => { haptic(12); logBodyweight(Math.round(bw * 10) / 10); }}>{t('save')}</button>
            </div>
          </Group>
          <Group header={t('trend')}>
            <div className="cell" style={{ display: 'block', padding: '12px 12px 8px' }}>
              <LineChart points={bodyweight.map((b) => ({ x: b.date, y: b.kg }))} unit={t('kg')} fmtY={(y) => y.toFixed(1)} color="#5e5ce6" />
            </div>
          </Group>
          {bodyweight.length > 0 && (
            <Group header={t('history')}>
              {bodyweight.slice(-6).reverse().map((b) => <Cell key={b.date} title={<span className="num">{b.kg} {t('kg')}</span>} detail={date(b.date)} />)}
            </Group>
          )}
        </>
      )}
    </div>
  );
}
